import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileFormData {
  email?: string;
  company_name: string;
  slogan: string;
  website_url: string;
  logo_url: string;
  logo_storage_path: string;
  industry: string;
  team_size: string;
  business_goal: string;
  phone_country_code: string;
  phone_country_dial: string;
  phone_number: string;
  country: string;
  country_code: string;
  street_address: string;
  city: string;
  postal_code: string;
  profile_completion_pct: number;
}

const TRACKED = [
  "company_name", "website_url", "logo_url", "industry", "team_size",
  "business_goal", "phone_number", "country", "street_address", "city", "postal_code",
] as const;

const empty = (): ProfileFormData => ({
  company_name: "", slogan: "", website_url: "", logo_url: "", logo_storage_path: "",
  industry: "", team_size: "", business_goal: "",
  phone_country_code: "BD", phone_country_dial: "+880", phone_number: "",
  country: "", country_code: "", street_address: "", city: "", postal_code: "",
  profile_completion_pct: 0,
});

export function calcCompletion(data: Partial<ProfileFormData>): number {
  const filled = TRACKED.filter((f) => {
    const v = (data as any)[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return Math.round((filled / TRACKED.length) * 100);
}

async function pathToUrl(path?: string | null): Promise<string> {
  if (!path) return "";
  const { data, error } = await supabase.storage
    .from("profile-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data) return "";
  return data.signedUrl;
}

export function useProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<ProfileFormData>(empty());
  const [formData, setFormData] = useState<ProfileFormData>(empty());
  const [stagedLogoFile, setStagedLogoFile] = useState<File | null>(null);
  const [stagedLogoPreview, setStagedLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const stagedPreviewRef = useRef<string | null>(null);

  const isDirty =
    JSON.stringify(formData) !== JSON.stringify(savedData) || stagedLogoFile !== null;

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("user_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const p: any = profile || {};
      const meta = (user.user_metadata || {}) as any;
      const signedLogo = await pathToUrl(p.logo_storage_path);

      const base: ProfileFormData = {
        email: user.email || undefined,
        company_name: p.company_name ?? meta.brand_name ?? meta.company_name ?? "",
        slogan: p.slogan ?? "",
        website_url: p.website_url ?? meta.website_url ?? "",
        logo_url: signedLogo || p.logo_url || "",
        logo_storage_path: p.logo_storage_path ?? "",
        industry: p.industry ?? meta.industry ?? "",
        team_size: p.team_size ?? meta.employee_size ?? "",
        business_goal: p.business_goal ?? meta.business_goal ?? "",
        phone_country_code: p.phone_country_code ?? "BD",
        phone_country_dial: p.phone_country_dial ?? "+880",
        phone_number: p.phone_number ?? "",
        country: p.country ?? "",
        country_code: p.country_code ?? "",
        street_address: p.street_address ?? "",
        city: p.city ?? "",
        postal_code: p.postal_code ?? "",
        profile_completion_pct: p.profile_completion_pct ?? 0,
      };

      setSavedData(base);
      setFormData(base);
      if (p.updated_at) setLastSaved(new Date(p.updated_at));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProfile(); }, [fetchProfile]);

  const updateField = useCallback(<K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const stageLogo = useCallback((file: File) => {
    if (stagedPreviewRef.current) URL.revokeObjectURL(stagedPreviewRef.current);
    const url = URL.createObjectURL(file);
    stagedPreviewRef.current = url;
    setStagedLogoFile(file);
    setStagedLogoPreview(url);
  }, []);

  const removeLogo = useCallback(() => {
    if (stagedPreviewRef.current) URL.revokeObjectURL(stagedPreviewRef.current);
    stagedPreviewRef.current = null;
    setStagedLogoFile(null);
    setStagedLogoPreview(null);
    setFormData((prev) => ({ ...prev, logo_url: "", logo_storage_path: "" }));
  }, []);

  const saveProfile = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let logoUrl = formData.logo_url;
      let logoStoragePath = formData.logo_storage_path;

      if (stagedLogoFile) {
        if (logoStoragePath) {
          await supabase.storage.from("profile-assets").remove([logoStoragePath]).catch(() => {});
        }
        const ext = (stagedLogoFile.name.split(".").pop() || "png").toLowerCase();
        const path = `${user.id}/logo/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-assets")
          .upload(path, stagedLogoFile, { upsert: true, contentType: stagedLogoFile.type });
        if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);
        logoStoragePath = path;
        logoUrl = await pathToUrl(path);
        if (stagedPreviewRef.current) URL.revokeObjectURL(stagedPreviewRef.current);
        stagedPreviewRef.current = null;
        setStagedLogoFile(null);
        setStagedLogoPreview(null);
      }

      const completion = calcCompletion({ ...formData, logo_url: logoUrl });

      const payload: any = {
        user_id: user.id,
        company_name: formData.company_name?.trim() || null,
        slogan: formData.slogan?.trim() || null,
        website_url: formData.website_url?.trim() || null,
        logo_url: logoUrl || null,
        logo_storage_path: logoStoragePath || null,
        industry: formData.industry || null,
        team_size: formData.team_size || null,
        business_goal: formData.business_goal?.trim() || null,
        phone_country_code: formData.phone_country_code || null,
        phone_country_dial: formData.phone_country_dial || null,
        phone_number: formData.phone_number?.trim() || null,
        country: formData.country || null,
        country_code: formData.country_code || null,
        street_address: formData.street_address?.trim() || null,
        city: formData.city?.trim() || null,
        postal_code: formData.postal_code?.trim() || null,
        profile_completion_pct: completion,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("user_profiles" as any)
        .upsert(payload, { onConflict: "user_id" });

      if (upsertError) throw new Error(upsertError.message);

      const updated: ProfileFormData = {
        ...formData,
        logo_url: logoUrl,
        logo_storage_path: logoStoragePath,
        profile_completion_pct: completion,
      };
      setSavedData(updated);
      setFormData(updated);
      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [formData, stagedLogoFile]);

  return {
    isLoading, isSaving, isDirty, error, lastSaved,
    formData, savedData, stagedLogoPreview,
    updateField, stageLogo, removeLogo, saveProfile,
    completionPct: calcCompletion(formData),
    refetch: fetchProfile,
  };
}
