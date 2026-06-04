// Server-only helpers for GA4 integration.
// Token encryption (AES-GCM via Web Crypto), GA4 API calls, Holt-Winters forecasting.
// Never import this file from client code.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Token encryption (AES-GCM, key derived from SUPABASE_SERVICE_ROLE_KEY) ----------

let _keyPromise: Promise<CryptoKey> | undefined;
async function getEncryptionKey(): Promise<CryptoKey> {
  if (_keyPromise) return _keyPromise;
  _keyPromise = (async () => {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      "HKDF",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: enc.encode("brandsync.ga4.tokens.v1"),
        info: enc.encode("aes-gcm-256"),
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();
  return _keyPromise;
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plain: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(plain) as BufferSource);
  return { ciphertext: b64encode(new Uint8Array(ct)), iv: b64encode(iv) };
}

export async function decryptToken(ciphertext: string, iv: string): Promise<string> {
  const key = await getEncryptionKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(iv) as BufferSource },
    key,
    b64decode(ciphertext) as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

// ---------- OAuth state signing (so the callback can trust the company_id) ----------

async function hmac(input: string): Promise<string> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input) as BufferSource);
  return b64encode(new Uint8Array(sig)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function signState(payload: { companyId: string; nonce: string; returnTo: string; source?: string; websiteUrl?: string }): Promise<string> {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, "");
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyState(state: string): Promise<{ companyId: string; nonce: string; returnTo: string; source?: string; websiteUrl?: string } | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected !== sig) return null;
  try {
    return JSON.parse(atob(body));
  } catch {
    return null;
  }
}

// ---------- Google OAuth ----------

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
];
export const GOOGLE_SCOPE_PARAM = GOOGLE_SCOPES.join(" ");
export const GA4_OAUTH_REDIRECT_URI = "https://sync-ai-os.lovable.app/api/public/ga/oauth/callback";

// Bump this whenever GOOGLE_SCOPES changes so existing connections are forced
// to re-authenticate and receive tokens that include the new scopes.
export const GOOGLE_SCOPES_VERSION = 5;

function buildGoogleOAuthQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function getGoogleClientId(): string {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("VITE_GOOGLE_CLIENT_ID is missing. Add the Google OAuth Web Client ID in Project Settings → Secrets.");
  }
  return clientId;
}

function getGoogleClientSecret(): string {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing. Add the matching Google OAuth Web Client Secret in Project Settings → Secrets.");
  }
  return clientSecret;
}

/**
 * GA4 API calls only need read access. Avoid requesting broader sensitive
 * Analytics scopes because unverified Google apps are more likely to be blocked.
 */
export const REQUIRED_ANALYTICS_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
];

/**
 * Returns true if the stored connection includes the required Analytics
 * scopes. When Google silently drops them (OAuth consent screen not
 * configured for Analytics, Analytics API not enabled in the Google Cloud
 * project, or app in Testing mode without the user as a test user), this
 * returns false and the UI prompts a reconnect.
 */
export function hasRequiredScopes(scopes: string[] | null | undefined): boolean {
  if (!scopes || scopes.length === 0) return false;
  const set = new Set(scopes);
  return REQUIRED_ANALYTICS_SCOPES.every((s) => set.has(s));
}

export function buildAuthUrl(opts: { redirectUri: string; state: string; loginHint?: string }): string {
  const params: Record<string, string> = {
    client_id: getGoogleClientId(),
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE_PARAM,
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  };
  if (opts.loginHint) params.login_hint = opts.loginHint;
  return `https://accounts.google.com/o/oauth2/v2/auth?${buildGoogleOAuthQuery(params)}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    id_token?: string;
  }>;
}

/**
 * Thrown when the stored refresh token is invalid/revoked/expired and the
 * user must reconnect their Google account. Server functions should let this
 * propagate so the UI can show a "Reconnect Google" prompt.
 */
export class GoogleReconnectRequiredError extends Error {
  code = "google_reconnect_required" as const;
  constructor(message = "Your Google connection has expired. Please reconnect your Google account.") {
    super(message);
    this.name = "GoogleReconnectRequiredError";
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    // Google returns 400 with { error: "invalid_grant" } when the refresh token
    // is expired, revoked, or otherwise no longer usable.
    const isInvalidGrant =
      res.status === 400 || res.status === 401 || /invalid_grant|invalid_token|unauthorized_client/i.test(text);
    if (isInvalidGrant) {
      throw new GoogleReconnectRequiredError();
    }
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ access_token: string; expires_in: number; scope: string }>;
}


// ---------- Connection access (fetches a usable access token, refreshing if needed) ----------

/**
 * Clear stored Google tokens for a company and mark the connection as needing
 * reconnection. Called when the refresh token itself is invalid/revoked.
 */
async function clearGoogleConnection(companyId: string, reason: string) {
  await supabaseAdmin
    .from("google_connections")
    .update({
      access_token: null,
      access_token_expires_at: null,
      refresh_token_ciphertext: null,
      refresh_token_iv: null,
      status: "needs_reconnect",
      last_error: reason,
    })
    .eq("company_id", companyId);
}

export async function getValidAccessToken(companyId: string): Promise<string> {
  const { data: conn, error } = await supabaseAdmin
    .from("google_connections")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!conn) throw new GoogleReconnectRequiredError("No Google connection for this company. Please connect your Google account.");

  // Force re-auth if the stored token doesn't cover all required scopes
  // (e.g. Google dropped analytics.readonly during consent).
  if (!hasRequiredScopes(conn.scopes)) {
    await clearGoogleConnection(companyId, "Insufficient OAuth scopes — reconnect required");
    throw new GoogleReconnectRequiredError(
      "Your Google connection is missing required Analytics permissions. Please reconnect your Google account.",
    );
  }

  if (conn.status === "needs_reconnect") {
    throw new GoogleReconnectRequiredError();
  }


  const expiresAt = conn.access_token_expires_at ? new Date(conn.access_token_expires_at).getTime() : 0;
  const now = Date.now();
  // Refresh if access token is missing OR expires within 60s.
  if (conn.access_token && expiresAt - 60_000 > now) return conn.access_token;

  if (!conn.refresh_token_ciphertext || !conn.refresh_token_iv) {
    await clearGoogleConnection(companyId, "Missing refresh token");
    throw new GoogleReconnectRequiredError();
  }

  let refreshToken: string;
  try {
    refreshToken = await decryptToken(conn.refresh_token_ciphertext, conn.refresh_token_iv);
  } catch (e: any) {
    await clearGoogleConnection(companyId, `Failed to decrypt refresh token: ${e?.message ?? e}`);
    throw new GoogleReconnectRequiredError();
  }

  let tok: { access_token: string; expires_in: number; scope: string };
  try {
    tok = await refreshAccessToken(refreshToken);
  } catch (e: any) {
    if (e instanceof GoogleReconnectRequiredError) {
      await clearGoogleConnection(companyId, e.message);
      throw e;
    }
    // Transient error — surface to caller without clearing the connection.
    throw e;
  }

  const newExpires = new Date(Date.now() + tok.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("google_connections")
    .update({ access_token: tok.access_token, access_token_expires_at: newExpires, status: "connected", last_error: null })
    .eq("company_id", companyId);
  return tok.access_token;
}

export function parseIdTokenEmail(idToken?: string): { email?: string; sub?: string } {
  if (!idToken) return {};
  try {
    const part = idToken.split(".")[1];
    if (!part) return {};
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    const json = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
    return { email: json.email, sub: json.sub };
  } catch {
    return {};
  }
}

// ---------- GA4 API ----------

export async function listAnalyticsProperties(accessToken: string) {
  // Discover accounts then properties
  const accountsRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!accountsRes.ok) throw new Error(`GA admin: ${accountsRes.status} ${await accountsRes.text()}`);
  const accounts = (await accountsRes.json()) as { accountSummaries?: any[] };
  const out: Array<{
    property_id: string;
    account_id: string;
    display_name: string;
    default_uri?: string;
    currency_code?: string;
    time_zone?: string;
    stream_uris?: string[];
  }> = [];
  for (const a of accounts.accountSummaries ?? []) {
    for (const p of a.propertySummaries ?? []) {
      const pid = String(p.property).replace(/^properties\//, "");
      // Fetch property detail (for default_uri/time_zone) and web data streams in parallel.
      let detail: any = {};
      let streamUris: string[] = [];
      try {
        const [dr, sr] = await Promise.all([
          fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${pid}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${pid}/dataStreams?pageSize=50`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);
        if (dr.ok) detail = await dr.json();
        if (sr.ok) {
          const sj = (await sr.json()) as { dataStreams?: any[] };
          streamUris = (sj.dataStreams ?? [])
            .map((s: any) => s?.webStreamData?.defaultUri)
            .filter((u: any): u is string => typeof u === "string" && u.length > 0);
        }
      } catch {}
      out.push({
        property_id: pid,
        account_id: String(a.account ?? "").replace(/^accounts\//, ""),
        display_name: p.displayName ?? `Property ${pid}`,
        default_uri: detail.defaultUri ?? streamUris[0],
        currency_code: detail.currencyCode,
        time_zone: detail.timeZone,
        stream_uris: streamUris,
      });
    }
  }
  return out;
}

type RunReportBody = {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  limit?: number;
  orderBys?: any[];
  keepEmptyRows?: boolean;
};

export async function runReport(accessToken: string, propertyId: string, body: RunReportBody) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 runReport ${propertyId}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------- Forecasting (Holt-Winters, additive, weekly seasonality) ----------

type ForecastPoint = { date: string; point: number; lower80: number; upper80: number; lower95: number; upper95: number };

function holtWintersAdditive(series: number[], seasonLength: number, horizon: number) {
  // Fit α, β, γ via simple grid search minimizing in-sample SSE.
  const n = series.length;
  if (n < seasonLength * 2 + 2) {
    // Not enough data — fall back to linear regression
    return linearForecast(series, horizon);
  }
  const grid = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
  let best: { sse: number; fits: number[]; level: number; trend: number; season: number[]; alpha: number; beta: number; gamma: number } | null = null;

  for (const alpha of grid) for (const beta of grid) for (const gamma of grid) {
    const { sse, fits, level, trend, season } = runHW(series, seasonLength, alpha, beta, gamma);
    if (!best || sse < best.sse) best = { sse, fits, level, trend, season, alpha, beta, gamma };
  }
  if (!best) return linearForecast(series, horizon);

  // Residual stdev
  const residuals = series.map((v, i) => v - best!.fits[i]).filter((_, i) => i >= seasonLength);
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance = residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(residuals.length - 1, 1);
  const sigma = Math.sqrt(variance);

  // MAPE
  const mapeArr = series.slice(seasonLength).map((v, i) => Math.abs((v - best!.fits[i + seasonLength]) / Math.max(Math.abs(v), 1)));
  const mape = mapeArr.length ? mapeArr.reduce((a, b) => a + b, 0) / mapeArr.length : 0;
  const rmse = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / Math.max(residuals.length, 1));

  const forecasts: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const f = best.level + h * best.trend + best.season[(n - seasonLength + ((h - 1) % seasonLength) + seasonLength) % seasonLength];
    forecasts.push(Math.max(0, f));
  }
  return { forecasts, sigma, mape, rmse, model: "holt-winters-additive" };
}

function runHW(series: number[], m: number, alpha: number, beta: number, gamma: number) {
  const n = series.length;
  // initial level = mean of first season
  let level = series.slice(0, m).reduce((a, b) => a + b, 0) / m;
  // initial trend = avg slope across first two seasons
  let trend = (series.slice(m, 2 * m).reduce((a, b) => a + b, 0) - series.slice(0, m).reduce((a, b) => a + b, 0)) / (m * m);
  const season = series.slice(0, m).map(v => v - level);
  const fits: number[] = new Array(n).fill(0);
  let sse = 0;
  for (let t = 0; t < n; t++) {
    const sIdx = t % m;
    const fit = level + trend + season[sIdx];
    fits[t] = fit;
    if (t >= m) sse += (series[t] - fit) ** 2;
    const prevLevel = level;
    level = alpha * (series[t] - season[sIdx]) + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    season[sIdx] = gamma * (series[t] - level) + (1 - gamma) * season[sIdx];
  }
  return { sse, fits, level, trend, season };
}

function linearForecast(series: number[], horizon: number) {
  const n = series.length;
  if (n === 0) return { forecasts: new Array(horizon).fill(0), sigma: 0, mape: 0, rmse: 0, model: "constant" };
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = series.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - xMean) * (series[i] - yMean); den += (xs[i] - xMean) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const fits = xs.map(x => intercept + slope * x);
  const residuals = series.map((v, i) => v - fits[i]);
  const variance = residuals.reduce((a, b) => a + b * b, 0) / Math.max(n - 1, 1);
  const sigma = Math.sqrt(variance);
  const forecasts = Array.from({ length: horizon }, (_, h) => Math.max(0, intercept + slope * (n + h)));
  const mapeArr = series.map((v, i) => Math.abs((v - fits[i]) / Math.max(Math.abs(v), 1)));
  const mape = mapeArr.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const rmse = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / Math.max(n, 1));
  return { forecasts, sigma, mape, rmse, model: "linear-regression" };
}

export function forecastSeries(series: number[], horizon: number, startDate: Date, seasonLength = 7): { points: ForecastPoint[]; mape: number; rmse: number; model: string } {
  const { forecasts, sigma, mape, rmse, model } = holtWintersAdditive(series, seasonLength, horizon);
  const points: ForecastPoint[] = forecasts.map((p, i) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i + 1);
    return {
      date: d.toISOString().slice(0, 10),
      point: round(p),
      lower80: round(Math.max(0, p - 1.28 * sigma)),
      upper80: round(p + 1.28 * sigma),
      lower95: round(Math.max(0, p - 1.96 * sigma)),
      upper95: round(p + 1.96 * sigma),
    };
  });
  return { points, mape: +mape.toFixed(4), rmse: +rmse.toFixed(4), model };
}

function round(n: number) { return Math.round(n * 100) / 100; }

// ---------- RAG / Recommendations via Lovable AI ----------

export async function generateRecommendations(input: {
  brandName: string;
  website?: string;
  industry?: string;
  snapshot: any;
  history: Array<{ date: string; sessions: number; users: number; bounce_rate: number }>;
  predictions: Array<{ metric: string; mape: number; model: string; nextWeek: number; growthPct: number }>;
}) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const prompt = `You are a brand growth strategist analysing real GA4 analytics for ${input.brandName} (${input.website ?? "unknown site"}, industry: ${input.industry ?? "unspecified"}).

Latest snapshot (JSON):
${JSON.stringify(input.snapshot).slice(0, 6000)}

Last 30 days (sample):
${JSON.stringify(input.history.slice(-30)).slice(0, 4000)}

Forecast summary:
${JSON.stringify(input.predictions).slice(0, 1500)}

Return STRICT JSON with this schema and nothing else:
{
  "recommendations": [
    { "kind": "growth"|"seo"|"content"|"audience"|"conversion", "title": string (<=80 chars), "body": string (2-3 sentences, specific to the data), "confidence": number 0..1 }
  ],
  "risks": [
    { "kind": "risk", "title": string, "body": string, "confidence": number }
  ],
  "summary": { "title": string, "body": string (3-5 sentences executive summary), "confidence": number }
}
Generate 4-6 recommendations, 1-3 risks, and 1 summary. Cite specific numbers from the data.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const txt = data?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(txt); } catch { return { recommendations: [], risks: [], summary: null }; }
}
