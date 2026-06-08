import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* AI content schema reused from existing generator */
const SYSTEM = `You are a Global Creative Director and Brand Strategist at a top-tier branding consultancy (Pentagram / Wolff Olins / Landor caliber). You will produce a COMPLETE, RESEARCH-GRADE, AGENCY-QUALITY brand guideline document.

CRITICAL RULES:
- Output ONLY one valid JSON object. No markdown, no preamble, no trailing commentary.
- Every text field must be substantial, specific, and decision-ready — NOT generic platitudes.
- Long-form fields (brand_story, mission_statement, vision_statement, positioning_statement, personality_description, etc.) must be 3–6 sentences minimum, written with confident editorial polish.
- Arrays should be FULL: dos/donts ≥ 8 each, core_values 5–7, sample_taglines ≥ 6, sample_headlines ≥ 6, sample_social_posts ≥ 4, font_usage_rules ≥ 6, logo forbidden_uses ≥ 8, brand_applications categories ≥ 5 items each, content_pillars ≥ 5.
- Reference the actual brand inputs (name, industry/aesthetic, colors, typography, summary). Do not invent contradictory facts; extrapolate plausibly when data is missing.
- For every color in color_palette, also output rgb (object with r,g,b 0-255), cmyk (object with c,m,y,k 0-100), pantone_suggestion (string, e.g. "PMS 2425 C"), psychology (1-2 sentences), and usage (specific application rules).
- For typography, provide a full hierarchy scale (H1/H2/H3/H4/Body Large/Body/Caption) each with font, weight, size (px and pt), line_height, letter_spacing, and usage.

Return EXACTLY this JSON shape (all keys required, do not omit):
{
  "brand_overview": {
    "mission_statement": "",
    "vision_statement": "",
    "brand_story": "",
    "brand_promise": "",
    "core_values": [ { "name": "", "description": "" } ],
    "unique_value_proposition": "",
    "brand_pillars": [ { "name": "", "description": "" } ],
    "elevator_pitch": ""
  },
  "voice_and_tone": {
    "primary_tone": "",
    "secondary_tone": "",
    "communication_style": "",
    "personality_description": "",
    "personality_traits": [ { "trait": "", "description": "" } ],
    "lexicon_we_use": [],
    "lexicon_we_avoid": [],
    "dos": [],
    "donts": [],
    "sample_taglines": [],
    "sample_headlines": [],
    "sample_social_posts": [],
    "sample_email_intro": "",
    "sample_about_paragraph": ""
  },
  "visual_identity": {
    "color_palette": {
      "primary":    { "hex":"#000000","name":"","rgb":{"r":0,"g":0,"b":0},"cmyk":{"c":0,"m":0,"y":0,"k":0},"pantone_suggestion":"","usage":"","psychology":"" },
      "secondary":  { "hex":"#000000","name":"","rgb":{"r":0,"g":0,"b":0},"cmyk":{"c":0,"m":0,"y":0,"k":0},"pantone_suggestion":"","usage":"","psychology":"" },
      "accent":     { "hex":"#000000","name":"","rgb":{"r":0,"g":0,"b":0},"cmyk":{"c":0,"m":0,"y":0,"k":0},"pantone_suggestion":"","usage":"","psychology":"" },
      "background": { "hex":"#FFFFFF","name":"","rgb":{"r":255,"g":255,"b":255},"cmyk":{"c":0,"m":0,"y":0,"k":0},"pantone_suggestion":"","usage":"","psychology":"" },
      "text":       { "hex":"#111111","name":"","rgb":{"r":17,"g":17,"b":17},"cmyk":{"c":0,"m":0,"y":0,"k":93},"pantone_suggestion":"","usage":"","psychology":"" }
    },
    "neutral_palette": [ { "hex":"#000000","name":"","usage":"" } ],
    "color_usage_rules": [],
    "color_combinations_recommended": [],
    "color_combinations_avoid": [],
    "typography": {
      "primary_font": "",
      "secondary_font": "",
      "primary_font_rationale": "",
      "secondary_font_rationale": "",
      "heading_style": "",
      "body_style": "",
      "font_usage_rules": [],
      "type_scale": [
        { "level":"H1","font":"","weight":"","size_px":"","size_pt":"","line_height":"","letter_spacing":"","usage":"" }
      ],
      "font_pairings": []
    },
    "logo_usage": {
      "construction_notes": "",
      "clear_space_rule": "",
      "minimum_size_digital": "",
      "minimum_size_print": "",
      "approved_backgrounds": [],
      "forbidden_uses": [],
      "logo_variations": [ { "name":"", "when_to_use":"" } ],
      "co_branding_rules": ""
    },
    "imagery_style": {
      "photography_direction": "",
      "illustration_style": "",
      "iconography_style": "",
      "composition_principles": [],
      "color_treatment": "",
      "dos": [],
      "donts": [],
      "mood_keywords": []
    }
  },
  "target_audience": {
    "primary_persona": { "name":"", "age_range":"", "occupation":"", "description":"", "pain_points":[], "goals":[], "motivations":[], "preferred_channels":[], "buying_behavior":"" },
    "secondary_persona": { "name":"", "age_range":"", "occupation":"", "description":"", "pain_points":[], "goals":[], "preferred_channels":[] }
  },
  "brand_positioning": {
    "positioning_statement": "",
    "category_definition": "",
    "competitive_differentiators": [],
    "market_category": "",
    "competitive_landscape_notes": "",
    "competitor_snapshot": [ { "name":"", "positioning":"", "how_we_differ":"" } ],
    "messaging_pillars": [ { "pillar":"", "proof_points":[] } ],
    "value_proposition_canvas": { "customer_jobs":[], "pains":[], "gains":[], "products_services":[], "pain_relievers":[], "gain_creators":[] }
  },
  "brand_applications": {
    "digital": [],
    "print": [],
    "social_media": [],
    "merchandise": [],
    "environmental": [],
    "packaging": []
  },
  "brand_dos_donts": {
    "overall_dos": [],
    "overall_donts": []
  },
  "accessibility": {
    "contrast_principles": [],
    "color_blind_considerations": [],
    "type_legibility_rules": [],
    "inclusive_language_rules": []
  },
  "digital_guidelines": {
    "website_principles": [],
    "social_media_guidelines": { "profile_bio_template":"", "hashtag_strategy":[], "posting_tone":"", "content_pillars":[], "posting_cadence":"" },
    "email_guidelines": { "subject_line_style":"", "greeting_style":"", "signature_template":"", "sample_subject_lines":[] }
  },
  "implementation_roadmap": {
    "phase_1_foundations": [],
    "phase_2_rollout": [],
    "phase_3_optimization": [],
    "governance_notes": ""
  }
}`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const f = cleaned.indexOf("{"), l = cleaned.lastIndexOf("}");
    if (f >= 0 && l > f) return JSON.parse(cleaned.slice(f, l + 1));
    throw new Error("AI returned non-JSON");
  }
}

/* Build AI content from a brand_summary row */
export const buildGuidelineContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandSummaryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: bs, error } = await supabase
      .from("brand_summary")
      .select("*")
      .eq("user_id", userId)
      .eq("id", data.brandSummaryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!bs) throw new Error("Brand summary not found");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const brief = {
      brand_name: bs.brand_name,
      website: bs.website_url,
      tagline: bs.tagline,
      summary: bs.ai_summary,
      values: bs.brand_values,
      aesthetic: bs.brand_aesthetic,
      tone: bs.brand_tone,
      archetype: bs.brand_archetype,
      colors: bs.brand_colors,
      typography: bs.typography,
      page_title: bs.page_title,
      meta_description: bs.meta_description,
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content:
              `Produce the complete agency-grade brand guideline JSON for the brand below. ` +
              `Write with editorial confidence. Every section must be richly detailed, specific to this brand, ` +
              `and decision-ready. Use the supplied colors and typography exactly when present; ` +
              `infer plausible CMYK/RGB from HEX. Do NOT omit any keys from the schema.\n\n` +
              `BRAND INPUT:\n${JSON.stringify(brief, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 16000,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is busy. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
      throw new Error(`AI error (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as any;
    const text = json.choices?.[0]?.message?.content ?? "";
    const content = extractJson(text);
    return { contentJson: JSON.stringify(content), brandSummaryJson: JSON.stringify(bs) };
  });

/* Insert generation row (status: generating) */
export const startGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brandSummaryId: z.string().uuid(),
      format: z.enum(["pdf", "ppt", "docx", "web"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("brand_guideline_generations")
      .insert({
        user_id: userId,
        brand_summary_id: data.brandSummaryId,
        format: data.format,
        status: "generating",
        generation_progress: 0,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

/* Progress ping (client-driven, syncs Realtime) */
export const updateGenerationProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      progress: z.number().min(0).max(100),
      step: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("brand_guideline_generations")
      .update({
        generation_progress: data.progress,
        current_step: data.step ?? null,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Finalize: client uploaded file to storage, now persist */
export const finalizeGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      storagePath: z.string().nullable().optional(),
      webBookSlug: z.string().nullable().optional(),
      fileSizeBytes: z.number().nullable().optional(),
      sectionsCount: z.number().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    let fileUrl: string | null = null;
    if (data.storagePath) {
      const { data: signed } = await supabase.storage
        .from("brand-guidelines")
        .createSignedUrl(data.storagePath, 60 * 60 * 24 * 7);
      fileUrl = signed?.signedUrl ?? null;
    }

    const { data: row, error } = await supabase
      .from("brand_guideline_generations")
      .update({
        status: "complete",
        generation_progress: 100,
        current_step: "Complete",
        file_url: fileUrl,
        file_storage_path: data.storagePath ?? null,
        web_book_slug: data.webBookSlug ?? null,
        file_size_bytes: data.fileSizeBytes ?? null,
        sections_count: data.sectionsCount ?? 11,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { fileUrl, storagePath: data.storagePath ?? null, sectionsCount: row?.sections_count ?? 11 };
  });



/* Mark error */
export const errorGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), message: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await supabase
      .from("brand_guideline_generations")
      .update({ status: "error", error_message: data.message })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

/* Fresh signed URL for download */
export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("brand_guideline_generations")
      .select("file_storage_path, format")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Error("Not found");
    if (!row.file_storage_path) throw new Error("No file");
    const { data: signed } = await supabase.storage
      .from("brand-guidelines")
      .createSignedUrl(row.file_storage_path, 60 * 60);
    return { downloadUrl: signed?.signedUrl ?? null };
  });

/* Create Web Brand Book microsite */
export const createWebBrandBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      generationId: z.string().uuid(),
      brandName: z.string(),
      brandData: z.any(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const base = (data.brandName || "brand")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "brand";

    // ensure uniqueness
    let slug = `${base}-brand-book`;
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase
        .from("web_brand_books")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-brand-book-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { error } = await supabase
      .from("web_brand_books")
      .insert({
        generation_id: data.generationId,
        user_id: userId,
        slug,
        brand_data: data.brandData,
      });
    if (error) throw new Error(error.message);
    return { slug };
  });

/* Public: fetch a brand book by slug */
export const getWebBrandBook = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("web_brand_books")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { book: null };
    // increment view count fire-and-forget
    void supabaseAdmin
      .from("web_brand_books")
      .update({ view_count: (row.view_count ?? 0) + 1 })
      .eq("id", row.id);
    return { book: row };
  });
