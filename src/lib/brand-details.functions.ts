import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMPTY_BRAND_DETAILS, type BrandDetails } from "@/types/brandDetails";

const nullableText = (max = 500) => z.string().trim().max(max).nullable().optional();
const urlText = nullableText(2048);
const businessHoursSchema = z.record(
  z.string(),
  z.object({ open: z.boolean(), start: z.string().max(16), end: z.string().max(16) }).or(z.unknown()),
).optional();

const BrandDetailsPatchSchema = z.object({
  address_lines: nullableText(1000),
  city: nullableText(120),
  state_province: nullableText(120),
  postal_code: nullableText(40),
  country_region_code: nullableText(8),
  phone_number: nullableText(40),
  business_hours_not_applicable: z.boolean().optional(),
  business_hours: businessHoursSchema,
  keywords: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  social_facebook: urlText,
  social_instagram: urlText,
  social_linkedin_personal: urlText,
  social_linkedin_company: urlText,
  social_twitter: urlText,
  social_youtube_channel: urlText,
  social_youtube_user: urlText,
  social_tiktok: urlText,
  social_pinterest: urlText,
  testimonial_1: nullableText(1000),
  testimonial_2: nullableText(1000),
  testimonial_3: nullableText(1000),
  testimonial_4: nullableText(1000),
  cta_business_email: nullableText(254),
  cta_appointment_url: urlText,
  cta_order_ahead_url: urlText,
  cta_reservation_url: urlText,
  cta_shop_online_url: urlText,
  cta_custom_url: urlText,
}).strict().partial();

export const getBrandDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("brand_details")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { data: ((data as unknown) as BrandDetails | null) ?? { ...EMPTY_BRAND_DETAILS, user_id: userId } };
  });

export const upsertBrandDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ patch: BrandDetailsPatchSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.patch, user_id: userId } as never;
    const { data: row, error } = await supabase
      .from("brand_details")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: row as unknown as BrandDetails };
  });
