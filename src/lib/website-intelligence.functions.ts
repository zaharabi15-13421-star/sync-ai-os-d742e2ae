import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAiJson<T = unknown>(
  system: string,
  user: string,
  fallback: T,
): Promise<T> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    }),
  });
  if (res.status === 429) throw new Error("Too many requests — please wait a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up in workspace settings.");
  if (!res.ok) return fallback;
  const json: any = await res.json();
  const text: string = json?.choices?.[0]?.message?.content ?? "";
  try {
    const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

/* ============ Brand name autocomplete ============ */
export const suggestBrands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().trim().min(2).max(60) }).parse(d),
  )
  .handler(async ({ data }) => {
    const result = await callAiJson<{ suggestions: Array<{ name: string; domain: string; industry: string }> }>(
      "You are a brand discovery engine for a marketing tool used in Bangladesh and Southeast Asia. Return ONLY raw JSON, no markdown.",
      `User typed: "${data.query}". Return a JSON object: {"suggestions":[{"name":"...","domain":"example.com","industry":"..."}]} with 5-8 real brand/company suggestions. Prioritize Bangladesh/SEA brands first, then global. Domains must be real and lowercase, no protocol.`,
      { suggestions: [] },
    );
    const list = (result.suggestions || []).filter(
      (s) => s && typeof s.name === "string" && typeof s.domain === "string",
    );
    return { suggestions: list.slice(0, 8) };
  });

/* ============ Brand intelligence (health + competitors + contact + social + tech) ============ */
export const generateBrandIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        url: z.string().url(),
        title: z.string().optional().nullable(),
        summary: z.string().optional().nullable(),
        markdown: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const ctxParts = [
      `URL: ${data.url}`,
      data.title ? `Title: ${data.title}` : "",
      data.summary ? `Summary: ${data.summary}` : "",
      data.markdown ? `Excerpt:\n${data.markdown.slice(0, 6000)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `You are a brand intelligence analyst for startup founders in Bangladesh and Southeast Asia. Use plain, jargon-free English. Return ONLY one JSON object with this exact shape (no markdown, no prose):
{
  "health": {
    "overall": number 0-100,
    "messaging": number 0-100,
    "visual": number 0-100,
    "seo": number 0-100,
    "trust": number 0-100,
    "mobile": number 0-100,
    "tips": { "messaging": string, "visual": string, "seo": string, "trust": string, "mobile": string }
  },
  "competitors": [{ "name": string, "domain": string, "industry": string }],
  "contact": { "email": string|null, "phone": string|null, "whatsapp": string|null, "address": string|null },
  "social": [{ "platform": "facebook"|"instagram"|"linkedin"|"youtube"|"tiktok"|"twitter"|"pinterest", "url": string, "handle": string }],
  "techStack": {
    "frontend": [{ "name": string, "icon": string }],
    "backend": [{ "name": string, "icon": string }],
    "cms": [{ "name": string, "icon": string }],
    "analytics": [{ "name": string, "icon": string }],
    "hosting": [{ "name": string, "icon": string }],
    "marketing": [{ "name": string, "icon": string }],
    "payments": [{ "name": string, "icon": string }],
    "other": [{ "name": string, "icon": string }]
  }
}
Rules: 4-5 real competitors prioritising BD/SEA. Use varied realistic health scores (avoid all 70s). Contact info should be extracted from the excerpt if visible, otherwise null. Tips must be short, specific, actionable. Icons: short emoji or one-word code (e.g. "⚛️" or "react").`;

    const fallback = {
      health: {
        overall: 65,
        messaging: 60,
        visual: 70,
        seo: 55,
        trust: 65,
        mobile: 75,
        tips: {
          messaging: "Make your homepage headline explain what you do in one short sentence.",
          visual: "Keep your colors and fonts the same across every page.",
          seo: "Add a short meta description to every key page.",
          trust: "Add real customer reviews or logos near the top of the page.",
          mobile: "Make sure buttons are easy to tap on a phone.",
        },
      },
      competitors: [] as Array<{ name: string; domain: string; industry: string }>,
      contact: { email: null, phone: null, whatsapp: null, address: null },
      social: [] as Array<{ platform: string; url: string; handle: string }>,
      techStack: {
        frontend: [], backend: [], cms: [], analytics: [],
        hosting: [], marketing: [], payments: [], other: [],
      },
    };

    const result = await callAiJson<typeof fallback>(system, ctxParts, fallback);
    return result;
  });

/* ============ SEO keywords + chart series + insight ============ */
const SEO_RANGES = ["3d", "7d", "30d", "3m", "custom"] as const;

export const generateSeoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        url: z.string().url(),
        range: z.enum(SEO_RANGES).default("7d"),
        days: z.number().int().min(1).max(90).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const daysMap: Record<typeof SEO_RANGES[number], number> = {
      "3d": 3, "7d": 7, "30d": 30, "3m": 90, custom: data.days ?? 7,
    };
    const days = daysMap[data.range];

    const system = `You are an SEO analyst for startup founders in Bangladesh and Southeast Asia. Plain language only. Return ONLY one JSON object:
{
  "keywords": [{ "keyword": string, "volume": number, "position": number, "change": number, "type": "primary"|"secondary"|"long-tail", "ctr": number }],
  "series": [{ "date": "YYYY-MM-DD", "volume": number, "position": number, "ctr": number }],
  "stats": { "total": number, "avgPosition": number, "topKeyword": string, "trendingUp": number },
  "insight": string
}
Rules: Generate ~30 realistic keywords for this site's industry (BD/SEA market focus). Positions 1-50, volumes 100-50000, changes -10 to +10, mix of branded/non-branded. CTR 0.1-30 (percent). Series array length must equal ${days} (one row per day, oldest first, dates ending today UTC). Insight = ONE short paragraph of actionable advice highlighting the biggest opportunity.`;

    const fallback = {
      keywords: [] as any[],
      series: [] as any[],
      stats: { total: 0, avgPosition: 0, topKeyword: "", trendingUp: 0 },
      insight: "Not enough data yet — run analysis again in a few days to see keyword trends.",
    };

    const result = await callAiJson<typeof fallback>(system, `URL: ${data.url}\nDate range: last ${days} days`, fallback);
    return result;
  });
