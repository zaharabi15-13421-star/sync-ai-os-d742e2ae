import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMPTY_BRAND_SUMMARY, ALLOWED_UPDATE_FIELDS, type BrandSummary } from "@/types/brandSummary";

/* ---------- get ---------- */
export const getBrandSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("brand_summary")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { data: ((data as unknown) as BrandSummary | null) ?? { ...EMPTY_BRAND_SUMMARY, user_id: userId } };
  });

/* ---------- upsert (single or multi field) ---------- */
const allowedSet = new Set<string>(ALLOWED_UPDATE_FIELDS as readonly string[]);

export const updateBrandSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patch: Record<string, unknown> }) => {
    const patch = input?.patch ?? {};
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (allowedSet.has(k)) clean[k] = v;
    }
    return { patch: clean };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const payload = { ...data.patch, user_id: userId };
    const { data: row, error } = await supabase
      .from("brand_summary")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: row as BrandSummary };
  });

/* ---------- AI Enhance ---------- */
const ENHANCE_PROMPTS: Record<string, { system: string; user: (v: string, b: any) => string }> = {
  ai_summary: {
    system: "You are a brand strategist writing concise, compelling brand summaries for SME business owners. Write in plain English, no jargon.",
    user: (v, b) => `Enhance this brand summary for ${b.brand_name || "the brand"} (${b.website_url || ""}). Current summary: ${v}. Make it more compelling, clear, and differentiated. Keep it 2-3 sentences maximum. Return ONLY the enhanced text, no preamble.`,
  },
  tagline: {
    system: "You are a brand copywriter specializing in punchy, memorable taglines.",
    user: (v, b) => `Enhance or suggest a better tagline for ${b.brand_name || "the brand"}. Current tagline: ${v}. Make it memorable, benefit-focused, and under 10 words. Return ONLY the tagline text, no quotes or preamble.`,
  },
  brand_values: {
    system: "You are a brand strategist identifying core brand values.",
    user: (v, b) => `Enhance these brand values for ${b.brand_name || "the brand"}: ${v}. Return 3-5 concise, distinct brand values as a comma-separated list, nothing else.`,
  },
  brand_aesthetic: {
    system: "You are a visual brand expert.",
    user: (v, b) => `Enhance this brand aesthetic description for ${b.brand_name || "the brand"}: ${v}. Describe the visual style in 1-2 sentences using specific, evocative language. Return ONLY the description.`,
  },
  meta_description: {
    system: "You are an SEO copywriter.",
    user: (v, b) => `Enhance this meta description for ${b.brand_name || "the brand"} to be more compelling and SEO-friendly under 160 characters: ${v}. Return ONLY the description.`,
  },
  page_title: {
    system: "You are an SEO copywriter.",
    user: (v, b) => `Enhance this page title for ${b.brand_name || "the brand"} (max 60 chars, SEO-optimized): ${v}. Return ONLY the title.`,
  },
  brand_name: {
    system: "You are a brand copywriter.",
    user: (v) => `Enhance or refine this brand name presentation: ${v}. Return ONLY the refined brand name.`,
  },
  brand_tone: {
    system: "You are a brand voice expert.",
    user: (v, b) => `Suggest the best brand tone description for ${b.brand_name || "the brand"} based on current tone: ${v}. Return 1-3 words describing the tone, nothing else.`,
  },
  brand_archetype: {
    system: "You are a brand strategist specializing in archetypes (Jungian).",
    user: (v, b) => `Suggest the most fitting brand archetype name for ${b.brand_name || "the brand"} (${b.website_url || ""}). Current: ${v}. Return ONLY the archetype name (e.g. "The Hero").`,
  },
};

async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai-enhance] gateway error", res.status, txt);
    throw new Error("ai_unavailable");
  }
  const json: any = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("ai_empty");
  return text;
}

export const enhanceBrandSummaryField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { field: string; current_value: string; instruction?: string | null }) => {
    const schema = z.object({
      field: z.string().min(1).max(64),
      current_value: z.string().min(1).max(5000),
      instruction: z.string().max(500).nullable().optional(),
    });
    return schema.parse(input);
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const cfg = ENHANCE_PROMPTS[data.field] ?? {
      system: "You are a professional brand copywriter.",
      user: (v: string, b: any) =>
        `Enhance this ${data.field} content for ${b.brand_name || "the brand"}: ${v}. ${data.instruction ?? ""}. Keep the same format but make it more compelling and professional. Return ONLY the enhanced text.`,
    };

    const { data: existing } = await supabase
      .from("brand_summary")
      .select("brand_name,website_url")
      .eq("user_id", userId)
      .maybeSingle();
    const brandCtx = existing ?? {};

    let enhanced: string;
    try {
      enhanced = await callLovableAI(cfg.system, cfg.user(data.current_value, brandCtx));
    } catch (e: any) {
      return { success: false, error: "ai_unavailable", message: "AI enhancement is temporarily unavailable. Please try again." };
    }

    // append history (best-effort)
    try {
      const { data: row } = await supabase
        .from("brand_summary")
        .select("ai_enhancement_history")
        .eq("user_id", userId)
        .maybeSingle();
      const hist: any[] = Array.isArray(row?.ai_enhancement_history) ? row!.ai_enhancement_history : [];
      hist.push({ field: data.field, original: data.current_value, enhanced, timestamp: new Date().toISOString() });
      await supabase
        .from("brand_summary")
        .upsert(
          { user_id: userId, ai_enhancement_history: hist.slice(-50), last_ai_enhanced_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    } catch (e) {
      console.warn("[ai-enhance] history append failed", e);
    }

    return { success: true, enhanced_value: enhanced, field: data.field };
  });

/* ---------- Detect brand assets (logo, tagline, values, aesthetic) ---------- */
async function firecrawlScrape(url: string): Promise<{ html?: string; markdown?: string; metadata?: any; links?: string[]; branding?: any }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      url,
      formats: ["html", "markdown", "links", "branding"],
      onlyMainContent: false,
    }),
  });
  if (!res.ok) throw new Error(`firecrawl ${res.status}`);
  const json: any = await res.json();
  const d = json?.data ?? json;
  return {
    html: d?.html,
    markdown: d?.markdown,
    metadata: d?.metadata,
    links: d?.links,
    branding: d?.branding,
  };
}

function pickLogoFromHtml(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    const abs = (src: string) => {
      try { return new URL(src, base).toString(); } catch { return null; }
    };
    const isLikelyLogo = (s: string) => /logo|brand|wordmark|sitelogo|site-logo/i.test(s);

    // 1) Prefer an <img> whose class/id/alt/src/data-* contains "logo" or
    //    "brand". This is what the live website actually renders as its logo.
    const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
    let svgCandidate: string | null = null;
    let firstCandidate: string | null = null;
    for (const tag of imgTags) {
      const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcMatch) continue;
      const src = srcMatch[1];
      const haystack = tag + " " + src;
      if (!isLikelyLogo(haystack)) continue;
      const absUrl = abs(src);
      if (!absUrl) continue;
      if (/\.svg(\?|#|$)/i.test(absUrl) && !svgCandidate) svgCandidate = absUrl;
      if (!firstCandidate) firstCandidate = absUrl;
    }
    if (svgCandidate) return svgCandidate;
    if (firstCandidate) return firstCandidate;

    // 2) First <img> inside <header> / <nav> — typically the site logo.
    const headerBlock = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i)?.[1]
      ?? html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
    if (headerBlock) {
      const img = headerBlock.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (img?.[1]) {
        const absUrl = abs(img[1]);
        if (absUrl) return absUrl;
      }
    }

    // 3) og:image — only as a last resort. Favicons are intentionally skipped
    //    because they are rarely the real brand logo.
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og?.[1]) return abs(og[1]);
  } catch {}
  return null;
}

function pickTaglineFromHtml(html: string): string | null {
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (desc?.[1]) {
    const first = desc[1].split(/[.!?]/)[0]?.trim();
    if (first && first.split(/\s+/).length <= 20) return first;
  }
  const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) {
    const first = og[1].split(/[.!?]/)[0]?.trim();
    if (first && first.split(/\s+/).length <= 20) return first;
  }
  return null;
}

export const detectBrandAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string; detect?: string[] }) =>
    z.object({
      url: z.string().url().max(2000),
      detect: z.array(z.string()).max(8).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const detect = new Set(data.detect ?? ["logo", "tagline", "brand_values", "brand_aesthetic"]);

    let scrape: Awaited<ReturnType<typeof firecrawlScrape>> | null = null;
    try {
      scrape = await firecrawlScrape(data.url);
    } catch (e) {
      console.warn("[detect-brand-assets] scrape failed", e);
      return { logo_url: null, tagline: null, brand_values: null, brand_aesthetic: null };
    }

    const html = scrape.html ?? "";
    const md = scrape.markdown ?? "";
    const branding = scrape.branding ?? {};

    const result: { logo_url: string | null; tagline: string | null; brand_values: string[] | null; brand_aesthetic: string | null } = {
      logo_url: null,
      tagline: null,
      brand_values: null,
      brand_aesthetic: null,
    };

    if (detect.has("logo")) {
      // Prefer the real <img> logo extracted from the live page HTML, then
      // Firecrawl's branding.logo / branding.images.logo. We deliberately
      // avoid favicons so the displayed logo matches the website exactly.
      const htmlLogo = html ? pickLogoFromHtml(html, data.url) : null;
      const brandingLogo =
        (typeof branding?.logo === "string" && branding.logo) ||
        (typeof branding?.images?.logo === "string" && branding.images.logo) ||
        null;
      result.logo_url = htmlLogo || brandingLogo || null;
    }
    if (detect.has("tagline")) {
      result.tagline = pickTaglineFromHtml(html);
    }

    // AI-based detection for values + aesthetic
    const contentSample = (md || html.replace(/<[^>]+>/g, " ")).slice(0, 2000);
    if (detect.has("brand_values")) {
      try {
        const text = await callLovableAI(
          "You identify core brand values from website content. Return ONLY a JSON array of 3-5 short strings.",
          `Website: ${data.url}\nContent: ${contentSample}`,
        );
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          if (Array.isArray(arr)) result.brand_values = arr.filter((s) => typeof s === "string").slice(0, 5);
        }
      } catch (e) {
        console.warn("[detect] values ai failed", e);
      }
    }
    if (detect.has("brand_aesthetic")) {
      try {
        const text = await callLovableAI(
          "You describe brand aesthetics in 3-7 words. Return ONLY the description.",
          `Website: ${data.url}\nContent: ${contentSample.slice(0, 1500)}`,
        );
        result.brand_aesthetic = text.replace(/^["']|["']$/g, "").slice(0, 300);
      } catch (e) {
        console.warn("[detect] aesthetic ai failed", e);
      }
    }

    // Save into brand_summary (best-effort)
    try {
      const patch: Record<string, unknown> = { user_id: userId, last_scraped_at: new Date().toISOString() };
      if (result.logo_url) { patch.logo_url = result.logo_url; patch.logo_user_uploaded = false; }
      if (result.tagline) patch.tagline = result.tagline;
      if (result.brand_values) patch.brand_values = result.brand_values;
      if (result.brand_aesthetic) patch.brand_aesthetic = result.brand_aesthetic;
      await supabase.from("brand_summary").upsert(patch, { onConflict: "user_id" });
    } catch (e) {
      console.warn("[detect] save failed", e);
    }

    return result;
  });
