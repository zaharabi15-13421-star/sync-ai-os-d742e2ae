
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  slogan text,
  website_url text,
  logo_url text,
  logo_storage_path text,
  industry text,
  team_size text,
  business_goal text,
  phone_country_code text,
  phone_country_dial text,
  phone_number text,
  country text,
  country_code text,
  street_address text,
  city text,
  postal_code text,
  profile_completion_pct integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage policies for profile-assets bucket (bucket itself created via tool)
CREATE POLICY "profile_assets_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_assets_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_assets_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_assets_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
