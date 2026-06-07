import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function cleanDisplayName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : null;
}

export const ensureAuthWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, claims } = context;
    const c = claims as Record<string, any>;
    const metadata = (c.user_metadata ?? c.app_metadata ?? {}) as Record<string, any>;
    const email = typeof c.email === "string" ? c.email : null;
    const fullName = cleanDisplayName(metadata.full_name ?? metadata.name ?? metadata.brand_name);
    const brandName = cleanDisplayName(metadata.brand_name) ?? fullName ?? email?.split("@")[0] ?? "My Brand";

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        avatar_url: cleanDisplayName(metadata.avatar_url ?? metadata.picture),
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(`Profile setup failed: ${profileError.message}`);

    const { data: membership, error: memberReadError } = await supabaseAdmin
      .from("company_members")
      .select("company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memberReadError) throw new Error(`Workspace lookup failed: ${memberReadError.message}`);
    if (membership?.company_id) return { ok: true, companyId: membership.company_id };

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        owner_id: userId,
        name: brandName,
        industry: cleanDisplayName(metadata.industry),
        employee_size: cleanDisplayName(metadata.employee_size),
        website_url: cleanDisplayName(metadata.website_url),
      })
      .select("id")
      .single();
    if (companyError || !company) throw new Error(`Workspace setup failed: ${companyError?.message ?? "No company created"}`);

    const { error: insertMemberError } = await supabaseAdmin
      .from("company_members")
      .insert({ company_id: company.id, user_id: userId, role: "owner" });
    if (insertMemberError && insertMemberError.code !== "23505") {
      throw new Error(`Membership setup failed: ${insertMemberError.message}`);
    }

    return { ok: true, companyId: company.id };
  });