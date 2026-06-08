import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Rich content schema returned by the AI for the Brand Guideline Generator.
export const BrandContentSchema = z.object({
  brand_overview: z.any(),
  voice_and_tone: z.any(),
  visual_identity: z.any(),
  target_audience: z.any(),
  brand_positioning: z.any(),
  digital_guidelines: z.any(),
});
export type BrandContent = z.infer<typeof BrandContentSchema>;

// Accept either a saved guideline id (authed flow) OR an inline brief (guest flow).
const BriefSchema = z.object({
  brand_name: z.string(),
  slogan: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  countries: z.any().optional(),
  website: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  brand_stage: z.string().nullable().optional(),
  primary_audience: z.string().nullable().optional(),
  brand_voice_tone: z.any().optional(),
  communication_style: z.string().nullable().optional(),
  brand_personality_archetype: z.string().nullable().optional(),
  brand_keywords: z.any().optional(),
  typography: z.string().nullable().optional(),
  color_preference: z.any().optional(),
  brand_positioning: z.string().nullable().optional(),
  competitor_brand: z.string().nullable().optional(),
  brand_admire: z.string().nullable().optional(),
});
const InputSchema = z.object({
  brief: BriefSchema,
});


const SYSTEM = `You are a world-class brand strategist and creative director. Given the brand brief, produce a complete, professional brand guideline document.

Return ONLY a single valid JSON object that matches this exact shape (no markdown, no preamble, no trailing prose):

{
  "brand_overview": {
    "mission_statement": "string",
    "vision_statement": "string",
    "brand_story": "string (2-3 paragraphs)",
    "core_values": ["v1","v2","v3","v4","v5"],
    "unique_value_proposition": "string"
  },
  "voice_and_tone": {
    "primary_tone": "string",
    "secondary_tone": "string",
    "communication_style": "string",
    "personality_description": "string",
    "dos": ["d1","d2","d3","d4","d5"],
    "donts": ["d1","d2","d3","d4","d5"],
    "sample_taglines": ["t1","t2","t3"],
    "sample_headlines": ["h1","h2","h3"],
    "sample_social_posts": ["p1","p2","p3"]
  },
  "visual_identity": {
    "color_palette": {
      "primary":    { "hex": "#RRGGBB", "name": "string", "usage": "string" },
      "secondary":  { "hex": "#RRGGBB", "name": "string", "usage": "string" },
      "accent":     { "hex": "#RRGGBB", "name": "string", "usage": "string" },
      "background": { "hex": "#RRGGBB", "name": "string", "usage": "string" },
      "text":       { "hex": "#RRGGBB", "name": "string", "usage": "string" }
    },
    "typography": {
      "primary_font": "string",
      "secondary_font": "string",
      "heading_style": "string",
      "body_style": "string",
      "font_usage_rules": ["r1","r2","r3"]
    },
    "logo_usage": {
      "clear_space_rule": "string",
      "minimum_size": "string",
      "approved_backgrounds": ["b1","b2"],
      "forbidden_uses": ["f1","f2","f3","f4"]
    },
    "imagery_style": {
      "photography_direction": "string",
      "illustration_style": "string",
      "dos": ["d1","d2","d3"],
      "donts": ["d1","d2","d3"]
    }
  },
  "target_audience": {
    "primary_persona": {
      "name": "string",
      "age_range": "string",
      "description": "string",
      "pain_points": ["p1","p2","p3"],
      "goals": ["g1","g2","g3"],
      "preferred_channels": ["c1","c2","c3"]
    },
    "secondary_persona": {
      "name": "string",
      "age_range": "string",
      "description": "string"
    }
  },
  "brand_positioning": {
    "positioning_statement": "string",
    "competitive_differentiators": ["d1","d2","d3"],
    "market_category": "string",
    "competitive_landscape_notes": "string"
  },
  "digital_guidelines": {
    "website_principles": ["p1","p2","p3"],
    "social_media_guidelines": {
      "profile_bio_template": "string",
      "hashtag_strategy": ["#h1","#h2","#h3","#h4","#h5"],
      "posting_tone": "string",
      "content_pillars": ["p1","p2","p3"]
    },
    "email_guidelines": {
      "subject_line_style": "string",
      "greeting_style": "string",
      "signature_template": "string"
    }
  }
}`;

function buildUserPrompt(g: Record<string, unknown>): string {
  const j = (v: unknown) => (v == null ? "None" : typeof v === "string" ? v : JSON.stringify(v));
  return `Brand Details
- Brand Name: ${j(g.brand_name)}
- Slogan: ${j(g.slogan)}
- Industry: ${j(g.industry)}
- Region: ${j(g.region)}
- Countries: ${j(g.countries)}
- Website: ${j(g.website)}
- Description: ${j(g.short_description)}
- Brand Stage: ${j(g.brand_stage)}
- Primary Audience: ${j(g.primary_audience)}
- Brand Voice & Tone: ${j(g.brand_voice_tone)}
- Communication Style: ${j(g.communication_style)}
- Brand Personality Archetype: ${j(g.brand_personality_archetype)}
- Brand Keywords: ${j(g.brand_keywords)}
- Typography Preference: ${j(g.typography)}
- Color Preference: ${j(g.color_preference)}
- Brand Positioning: ${j(g.brand_positioning)}
- Competitor Brands: ${j(g.competitor_brand)}
- Brands Admired: ${j(g.brand_admire)}

Output the JSON object now. No commentary.`;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  // Try direct parse, then fall back to substring between the first { and last }.
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}

export const generateBrandGuideline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserPrompt(data.brief as Record<string, unknown>) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is rate-limited. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      throw new Error(`AI gateway error (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);
    const content = BrandContentSchema.parse(parsed);

    return { success: true as const, content };
  });


// Re-export legacy type alias kept for any stale imports — narrowed to BrandContent.
export type Guideline = BrandContent;
