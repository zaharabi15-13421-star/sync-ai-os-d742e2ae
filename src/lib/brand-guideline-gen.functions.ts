import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* AI content schema reused from existing generator */
const SYSTEM = `You are a world-class brand strategist and creative director. Given the brand data, return ONLY a single valid JSON object (no markdown, no preamble) with this exact shape:
{
  "brand_overview": { "mission_statement": "", "vision_statement": "", "brand_story": "", "core_values": [], "unique_value_proposition": "" },
  "voice_and_tone": { "primary_tone": "", "secondary_tone": "", "communication_style": "", "personality_description": "", "dos": [], "donts": [], "sample_taglines": [], "sample_headlines": [], "sample_social_posts": [] },
  "visual_identity": { "color_palette": { "primary": {"hex":"#000000","name":"","usage":""}, "secondary": {"hex":"#000000","name":"","usage":""}, "accent": {"hex":"#000000","name":"","usage":""}, "background": {"hex":"#000000","name":"","usage":""}, "text": {"hex":"#000000","name":"","usage":""} }, "typography": { "primary_font": "", "secondary_font": "", "heading_style": "", "body_style": "", "font_usage_rules": [] }, "logo_usage": { "clear_space_rule":"", "minimum_size":"", "approved_backgrounds":[], "forbidden_uses":[] }, "imagery_style": { "photography_direction":"", "illustration_style":"", "dos":[], "donts":[] } },
  "target_audience": { "primary_persona": { "name":"", "age_range":"", "description":"", "pain_points":[], "goals":[], "preferred_channels":[] }, "secondary_persona": { "name":"", "age_range":"", "description":"" } },
  "brand_positioning": { "positioning_statement":"", "competitive_differentiators":[], "market_category":"", "competitive_landscape_notes":"" },
  "digital_guidelines": { "website_principles":[], "social_media_guidelines":{ "profile_bio_template":"", "hashtag_strategy":[], "posting_tone":"", "content_pillars":[] }, "email_guidelines":{ "subject_line_style":"", "greeting_style":"", "signature_template":"" } }
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Generate the brand guideline JSON for this brand:\n${JSON.stringify(brief)}` },
        ],
        response_format: { type: "json_object" },
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
    return { generation: row };
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
