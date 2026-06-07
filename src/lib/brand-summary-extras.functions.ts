import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { lovableModel } from "@/lib/ai-gateway";

export type BrandArchetype = { name: string; description: string } | null;

export type BrandSummaryExtras = {
  logo_url: string | null;
  tagline: string | null;
  brand_values: string[];
  brand_aesthetic: string[];
  brand_tone: string[];
  brand_archetype: BrandArchetype;
};

const ExtrasPatch = z.object({
  logo_url: z.string().max(2048).nullable().optional(),
  tagline: z.string().max(280).nullable().optional(),
  brand_values: z.array(z.string().min(1).max(80)).max(20).optional(),
  brand_aesthetic: z.array(z.string().min(1).max(80)).max(15).optional(),
  brand_tone: z.array(z.string().min(1).max(60)).max(8).optional(),
  brand_archetype: z
    .object({ name: z.string().min(1).max(80), description: z.string().min(1).max(280) })
    .nullable()
    .optional(),
});

const empty: BrandSummaryExtras = {
  logo_url: null,
  tagline: null,
  brand_values: [],
  brand_aesthetic: [],
  brand_tone: [],
  brand_archetype: null,
};

export const getBrandSummaryExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("brand_summary_extras")
      .select("logo_url,tagline,brand_values,brand_aesthetic,brand_tone,brand_archetype")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { data: (data as BrandSummaryExtras | null) ?? empty };
  });

export const upsertBrandSummaryExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ patch: ExtrasPatch }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const payload = { user_id: userId, ...data.patch };
    const { data: row, error } = await supabase
      .from("brand_summary_extras")
      .upsert(payload as never, { onConflict: "user_id" })
      .select("logo_url,tagline,brand_values,brand_aesthetic,brand_tone,brand_archetype")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, data: row as BrandSummaryExtras };
  });

/* ============== AI ENHANCE ============== */

const EnhanceInput = z.object({
  field: z.enum(["tagline", "brand_values", "brand_aesthetic", "brand_tone", "brand_archetype"]),
  current: z.any(),
  context: z
    .object({
      brandName: z.string().max(200).optional(),
      url: z.string().max(500).optional(),
      summary: z.string().max(4000).optional(),
      colors: z.record(z.string(), z.string()).optional(),
    })
    .default({}),
});

const ARCHETYPES = [
  "The Explorer","The Jester","The Ruler","The Rebel","The Lover","The Innocent",
  "The Everyperson","The Magician","The Hero","The Coach","The Scholar","The Empowerer",
  "The Pathfinder","The Sage","The Creator","The Caregiver","The Outlaw","The Mentor","The Citizen",
];

const TONE_OPTIONS = [
  "Professional","Friendly","Bold & Edgy","Playful","Inspirational","Luxury","Technical","Empathetic",
];

export const enhanceBrandSummaryField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EnhanceInput.parse(d))
  .handler(async ({ data }) => {
    const model = lovableModel("google/gemini-2.5-flash");
    const ctxBlock = `Brand: ${data.context.brandName ?? "(unknown)"}
Website: ${data.context.url ?? "(unknown)"}
Business overview: ${data.context.summary ?? "(unknown)"}
Brand colors: ${data.context.colors ? JSON.stringify(data.context.colors) : "(unknown)"}
Current value: ${JSON.stringify(data.current ?? null)}`;

    if (data.field === "tagline") {
      const { text } = await generateText({
        model,
        prompt: `Write ONE powerful, memorable brand tagline (max 90 chars). Output the tagline only — no quotes, no preface.

${ctxBlock}`,
        temperature: 0.8,
      });
      return { value: text.trim().replace(/^["']|["']$/g, "").slice(0, 200) };
    }

    if (data.field === "brand_archetype") {
      const { object } = await generateObject({
        model,
        schema: z.object({
          name: z.enum(ARCHETYPES as [string, ...string[]]),
          description: z.string().min(6).max(200),
        }),
        prompt: `Pick the single best-fit brand archetype for this brand. Choose from the provided enum.

${ctxBlock}`,
        temperature: 0.4,
      });
      return { value: object };
    }

    // Tag-list fields
    const TONE_ENUM = ["Professional","Friendly","Bold & Edgy","Playful","Inspirational","Luxury","Technical","Empathetic","Authoritative","Witty","Warm","Confident"] as const;
    const schema =
      data.field === "brand_tone"
        ? z.object({
            tags: z.array(z.enum(TONE_ENUM)).min(1).max(4),
          })
        : z.object({ tags: z.array(z.string().min(2).max(40)).min(3).max(6) });

    const fieldGuide = {
      brand_values: "Extract 4-6 concise brand value words/phrases (e.g. Innovation, Trust, Craftsmanship).",
      brand_aesthetic: "Generate 4-6 short aesthetic descriptors (e.g. minimalist, bold, editorial, high-contrast).",
      brand_tone: `Pick 2-3 best-fit brand tones from: ${TONE_OPTIONS.join(", ")}.`,
    }[data.field];

    const { object } = await generateObject({
      model,
      schema,
      prompt: `${fieldGuide}

${ctxBlock}`,
      temperature: 0.6,
    });
    return { value: object.tags };
  });
