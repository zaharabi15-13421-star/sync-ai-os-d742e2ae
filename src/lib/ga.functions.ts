// GA4 / Brand Intelligence server functions.
// Keep this file thin: server fn declarations only. Heavy logic lives in ga.server.ts.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildAuthUrl,
  decryptToken,
  encryptToken,
  exchangeCode,
  forecastSeries,
  generateRecommendations,
  getValidAccessToken,
  listAnalyticsProperties,
  parseIdTokenEmail,
  runReport,
  signState,
} from "./ga.server";

function getPublicOrigin(): string {
  // Always use the public app URL for OAuth redirects so Google's allow-list matches exactly.
  const explicit = process.env.PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://sync-ai-os.lovable.app";
}

function redirectUri() {
  return `${getPublicOrigin()}/api/public/ga/oauth/callback`;
}

async function getCompanyForUser(userId: string, userEmail?: string | null): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.company_id;

  // Auto-provision: legacy users may exist without a company (the handle_new_user
  // trigger was historically missing). Create profile + company + membership now.
  const brandName = userEmail ? userEmail.split("@")[0] : "My Brand";
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, email: userEmail ?? null }, { onConflict: "id" });
  const { data: company, error: cErr } = await supabaseAdmin
    .from("companies")
    .insert({ owner_id: userId, name: brandName })
    .select("id")
    .single();
  if (cErr || !company) throw cErr ?? new Error("Failed to provision company");
  await supabaseAdmin
    .from("company_members")
    .insert({ company_id: company.id, user_id: userId, role: "owner" });
  return company.id;
}

// ---- Connection status

export const getGa4Status = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    const [{ data: conn }, { data: mapping }, { data: props }, { data: company }] = await Promise.all([
      supabaseAdmin.from("google_connections").select("google_user_email,status,last_synced_at,scopes,access_token_expires_at,connection_source,website_url,last_error").eq("company_id", companyId).maybeSingle(),
      supabaseAdmin.from("ga4_property_mappings").select("property_id").eq("company_id", companyId).maybeSingle(),
      supabaseAdmin.from("ga4_properties").select("property_id,display_name,default_uri,time_zone,currency_code").eq("company_id", companyId),
      supabaseAdmin.from("companies").select("id,name,industry,website_url").eq("id", companyId).maybeSingle(),
    ]);
    return {
      companyId,
      company,
      connected: !!conn && conn.status === "connected",
      googleEmail: conn?.google_user_email ?? null,
      lastSyncedAt: conn?.last_synced_at ?? null,
      lastError: conn?.last_error ?? null,
      connectionSource: (conn as any)?.connection_source ?? null,
      connectionWebsiteUrl: (conn as any)?.website_url ?? null,
      selectedPropertyId: mapping?.property_id ?? null,
      properties: props ?? [],
    };
  });

// ---- OAuth URL

export const getGa4AuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    returnTo: z.string().min(1).max(500).optional(),
    source: z.enum(["brand_dna", "brand_intelligence", "manual"]).optional(),
    websiteUrl: z.string().min(1).max(500).optional(),
  }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    // Normalize website URL: strip protocol, www, trailing slash.
    let normalizedUrl: string | undefined;
    if (data.websiteUrl) {
      normalizedUrl = data.websiteUrl
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/.*$/, "")
        .toLowerCase();
      if (normalizedUrl) {
        // Persist on the company record so property auto-match works.
        await supabaseAdmin.from("companies").update({ website_url: normalizedUrl }).eq("id", companyId);
      }
    }
    const nonce = crypto.randomUUID();
    const state = await signState({
      companyId,
      nonce,
      returnTo: data.returnTo ?? "/dashboard/intelligence",
      source: data.source ?? "brand_intelligence",
      websiteUrl: normalizedUrl,
    });
    return { url: buildAuthUrl({ redirectUri: redirectUri(), state }) };
  });

// ---- List / Select properties

export const listGa4Properties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ websiteUrl: z.string().min(1).max(500).optional() }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);

    // If the caller passed a fresh website URL (e.g. user typed a new one in the
    // "view traffic for any website" card), persist it so auto-match uses it below.
    if (data.websiteUrl) {
      const normalized = data.websiteUrl
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/.*$/, "")
        .toLowerCase();
      if (normalized) {
        await Promise.all([
          supabaseAdmin.from("google_connections").update({ website_url: normalized, updated_at: new Date().toISOString() }).eq("company_id", companyId),
          supabaseAdmin.from("companies").update({ website_url: normalized }).eq("id", companyId),
        ]);
      }
    }

    const accessToken = await getValidAccessToken(companyId);
    const props = await listAnalyticsProperties(accessToken);
    if (props.length) {
      // Persist only DB-recognised columns (strip stream_uris which lives in-memory).
      await supabaseAdmin.from("ga4_properties").upsert(
        props.map(({ stream_uris, ...rest }) => ({ company_id: companyId, ...rest })),
        { onConflict: "company_id,property_id" },
      );
    }

    // Determine the website URL the user most recently asked us to track. Prefer the
    // value captured during the OAuth round-trip (google_connections.website_url),
    // and fall back to the company record.
    const [{ data: conn }, { data: company }, { data: existing }] = await Promise.all([
      supabaseAdmin.from("google_connections").select("website_url").eq("company_id", companyId).maybeSingle(),
      supabaseAdmin.from("companies").select("website_url").eq("id", companyId).maybeSingle(),
      supabaseAdmin.from("ga4_property_mappings").select("property_id").eq("company_id", companyId).maybeSingle(),
    ]);
    const normalize = (s: string | null | undefined) =>
      (s ?? "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
    const site = normalize(conn?.website_url) || normalize(company?.website_url);
    const hostMatches = (host: string) => {
      if (!host || !site) return false;
      return host === site || host.endsWith("." + site) || site.endsWith("." + host);
    };
    const propMatches = (p: any) => {
      if (hostMatches(normalize(p.default_uri))) return true;
      const streams: string[] = Array.isArray(p.stream_uris) ? p.stream_uris : [];
      return streams.some((u) => hostMatches(normalize(u)));
    };

    const match = site ? props.find(propMatches) : undefined;

    if (match) {
      await supabaseAdmin.from("ga4_property_mappings").upsert({
        company_id: companyId,
        property_id: match.property_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" });
    }
    // Return a strip-of-stream-uris-free list (clients use default_uri + this `properties` list
    // to render a manual-select dropdown when no automatic match is found).
    return {
      properties: props,
      matchedPropertyId: match?.property_id ?? null,
      hasExistingMapping: !!existing,
      site: site || null,
    };
  });

export const selectGa4Property = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ propertyId: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ context, data }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    const { error } = await supabaseAdmin.from("ga4_property_mappings").upsert({ company_id: companyId, property_id: data.propertyId, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });

export const disconnectGa4 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    await supabaseAdmin.from("google_connections").delete().eq("company_id", companyId);
    await supabaseAdmin.from("ga4_property_mappings").delete().eq("company_id", companyId);
    return { ok: true };
  });

// ---- Sync

export const syncGa4 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ periodDays: z.number().int().min(7).max(365).default(90) }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    return runSyncForCompany(companyId, data.periodDays);
  });

// Exported so the cron route + manual sync can both call it.
export async function runSyncForCompany(companyId: string, periodDays = 90) {
  const { data: mapping } = await supabaseAdmin.from("ga4_property_mappings").select("property_id").eq("company_id", companyId).maybeSingle();
  if (!mapping?.property_id) throw new Error("No GA4 property selected");
  const propertyId = mapping.property_id;
  const accessToken = await getValidAccessToken(companyId);

  const today = new Date();
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - periodDays);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  // Run reports in parallel
  const [totals, daily, channels, sources, countries, devices, age, gender, pages] = await Promise.all([
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
        { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "screenPageViewsPerSession" }, { name: "engagementRate" },
      ],
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" },
        { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "screenPageViewsPerSession" }, { name: "engagementRate" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 25,
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 15,
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "userAgeBracket" }],
      metrics: [{ name: "totalUsers" }],
    }).catch(() => ({ rows: [] })),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "userGender" }],
      metrics: [{ name: "totalUsers" }],
    }).catch(() => ({ rows: [] })),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    }),
  ]);

  // ----- Totals
  const totalsRow = totals.rows?.[0]?.metricValues ?? [];
  const totalsObj = {
    sessions: num(totalsRow[0]),
    users: num(totalsRow[1]),
    new_users: num(totalsRow[2]),
    returning_users: Math.max(0, num(totalsRow[1]) - num(totalsRow[2])),
    bounce_rate: num(totalsRow[3]),
    avg_session_duration: num(totalsRow[4]),
    pages_per_session: num(totalsRow[5]),
    engagement_rate: num(totalsRow[6]),
  };

  // ----- Daily history
  const dailyRows = (daily.rows ?? []).map((r: any) => {
    const d: string = r.dimensionValues?.[0]?.value ?? "";
    const iso = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
    const m = r.metricValues ?? [];
    return {
      company_id: companyId,
      property_id: propertyId,
      date: iso,
      sessions: Math.round(num(m[0])),
      users: Math.round(num(m[1])),
      new_users: Math.round(num(m[2])),
      returning_users: Math.max(0, Math.round(num(m[1])) - Math.round(num(m[2]))),
      bounce_rate: num(m[3]),
      avg_session_duration: num(m[4]),
      pages_per_session: num(m[5]),
      engagement_rate: num(m[6]),
    };
  }).filter((r: any) => r.date);

  if (dailyRows.length) {
    await supabaseAdmin.from("analytics_history").upsert(dailyRows, { onConflict: "company_id,property_id,date" });
  }

  const period_start = dailyRows[0]?.date ?? startDate;
  const period_end = dailyRows[dailyRows.length - 1]?.date ?? endDate;

  const snapshotRow = {
    company_id: companyId,
    property_id: propertyId,
    period_start,
    period_end,
    granularity: "daily",
    totals: totalsObj,
    channels: rowsAsList(channels, ["channel", "sessions"]),
    traffic_sources: rowsAsList(sources, ["source", "sessions"]),
    countries: rowsAsList(countries, ["country", "sessions"]),
    devices: rowsAsList(devices, ["device", "sessions"]),
    age: rowsAsList(age, ["bucket", "users"]),
    gender: rowsAsList(gender, ["bucket", "users"]),
    top_pages: ((pages.rows ?? []) as any[]).map((r) => ({
      page: r.dimensionValues?.[0]?.value,
      views: num(r.metricValues?.[0]),
      sessions: num(r.metricValues?.[1]),
    })),
    keywords: [],
  };

  await supabaseAdmin.from("analytics_snapshots").upsert(snapshotRow, { onConflict: "company_id,property_id,period_start,period_end,granularity" });
  await supabaseAdmin.from("audience_insights").upsert({
    company_id: companyId,
    property_id: propertyId,
    period_start,
    period_end,
    payload: { age: snapshotRow.age, gender: snapshotRow.gender, devices: snapshotRow.devices, countries: snapshotRow.countries },
  }, { onConflict: "company_id,property_id,period_start,period_end" });

  await supabaseAdmin.from("google_connections").update({ last_synced_at: new Date().toISOString() }).eq("company_id", companyId);

  // ----- Forecasts (sessions, users, bounce_rate) for 30 days
  const today2 = new Date(period_end + "T00:00:00Z");
  for (const metric of ["sessions", "users", "bounce_rate"] as const) {
    const series = dailyRows.map((r: any) => Number(r[metric]) || 0);
    if (series.length < 14) continue;
    const { points, mape, rmse, model } = forecastSeries(series, 30, today2, 7);
    await supabaseAdmin.from("predictions").upsert({
      company_id: companyId,
      property_id: propertyId,
      metric,
      horizon_days: 30,
      model,
      mape,
      rmse,
      series: points,
      generated_at: new Date().toISOString(),
    }, { onConflict: "company_id,property_id,metric,horizon_days" });
  }

  return { ok: true, totals: totalsObj, days: dailyRows.length };
}

function num(mv: any): number {
  if (!mv) return 0;
  const v = typeof mv === "object" ? mv.value : mv;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowsAsList(report: any, keys: [string, string]) {
  return ((report?.rows ?? []) as any[]).map((r) => ({
    [keys[0]]: r.dimensionValues?.[0]?.value ?? "",
    [keys[1]]: num(r.metricValues?.[0]),
  }));
}

// ---- Read analytics for dashboard

export const getGa4Analytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    const { data: mapping } = await supabaseAdmin.from("ga4_property_mappings").select("property_id").eq("company_id", companyId).maybeSingle();
    if (!mapping?.property_id) return { connected: false };

    const today = new Date();
    const end = data.endDate ?? today.toISOString().slice(0, 10);
    const startD = data.startDate ?? new Date(today.getTime() - 90 * 86400_000).toISOString().slice(0, 10);

    const [{ data: snap }, { data: history }, { data: preds }, { data: recs }] = await Promise.all([
      supabaseAdmin.from("analytics_snapshots").select("*").eq("company_id", companyId).eq("property_id", mapping.property_id).order("period_end", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("analytics_history").select("*").eq("company_id", companyId).eq("property_id", mapping.property_id).gte("date", startD).lte("date", end).order("date", { ascending: true }),
      supabaseAdmin.from("predictions").select("*").eq("company_id", companyId).eq("property_id", mapping.property_id),
      supabaseAdmin.from("recommendations").select("*").eq("company_id", companyId).order("generated_at", { ascending: false }).limit(20),
    ]);

    return {
      connected: true,
      propertyId: mapping.property_id,
      snapshot: snap,
      history: history ?? [],
      predictions: preds ?? [],
      recommendations: recs ?? [],
    };
  });

// ---- Recommendations refresh

export const refreshGa4Recommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const companyId = await getCompanyForUser(userId, (claims as any)?.email);
    const { data: company } = await supabaseAdmin.from("companies").select("name,website_url,industry").eq("id", companyId).maybeSingle();
    const { data: snap } = await supabaseAdmin.from("analytics_snapshots").select("*").eq("company_id", companyId).order("period_end", { ascending: false }).limit(1).maybeSingle();
    if (!snap) throw new Error("No analytics snapshot yet — sync GA4 first.");
    const { data: history } = await supabaseAdmin.from("analytics_history").select("date,sessions,users,bounce_rate").eq("company_id", companyId).order("date", { ascending: true }).limit(180);
    const { data: preds } = await supabaseAdmin.from("predictions").select("metric,model,mape,series").eq("company_id", companyId);

    const predSummary = (preds ?? []).map(p => {
      const pts = (p.series as any[]) ?? [];
      const last7 = pts.slice(0, 7).reduce((a, b) => a + (b.point ?? 0), 0);
      const first = history?.[history.length - 7]?.[p.metric as "sessions" | "users" | "bounce_rate"] ?? 0;
      const recent7 = (history ?? []).slice(-7).reduce((a, b) => a + Number((b as any)[p.metric] ?? 0), 0);
      const growthPct = recent7 ? ((last7 - recent7) / recent7) * 100 : 0;
      return { metric: p.metric, model: p.model, mape: Number(p.mape ?? 0), nextWeek: Math.round(last7), growthPct: +growthPct.toFixed(1) };
    });

    const out = await generateRecommendations({
      brandName: company?.name ?? "Brand",
      website: company?.website_url ?? undefined,
      industry: company?.industry ?? undefined,
      snapshot: snap,
      history: (history ?? []).map(h => ({ date: h.date, sessions: h.sessions, users: h.users, bounce_rate: Number(h.bounce_rate) })),
      predictions: predSummary,
    });

    // Replace previous batch
    await supabaseAdmin.from("recommendations").delete().eq("company_id", companyId);
    const rows: any[] = [];
    for (const r of out.recommendations ?? []) {
      rows.push({ company_id: companyId, kind: r.kind, title: String(r.title ?? "").slice(0, 200), body: String(r.body ?? ""), confidence: Number(r.confidence ?? 0.7) });
    }
    for (const r of out.risks ?? []) {
      rows.push({ company_id: companyId, kind: "risk", title: String(r.title ?? "").slice(0, 200), body: String(r.body ?? ""), confidence: Number(r.confidence ?? 0.6) });
    }
    if (out.summary) {
      rows.push({ company_id: companyId, kind: "summary", title: String(out.summary.title ?? "Executive summary").slice(0, 200), body: String(out.summary.body ?? ""), confidence: Number(out.summary.confidence ?? 0.8) });
    }
    if (rows.length) await supabaseAdmin.from("recommendations").insert(rows);
    return { ok: true, count: rows.length };
  });

// Re-export helpers needed by routes
export { exchangeCode, parseIdTokenEmail, encryptToken, decryptToken, redirectUri };
