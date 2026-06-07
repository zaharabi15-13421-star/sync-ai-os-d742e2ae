import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMPTY_BRAND_DETAILS, type BrandDetails } from "@/types/brandDetails";

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
    return { data: (data as BrandDetails | null) ?? { ...EMPTY_BRAND_DETAILS, user_id: userId } };
  });

export const upsertBrandDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patch: Partial<BrandDetails> }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.patch, user_id: userId };
    const { data: row, error } = await supabase
      .from("brand_details")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: row as BrandDetails };
  });
