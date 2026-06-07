
CREATE TABLE IF NOT EXISTS public.brand_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  website_url TEXT,
  brand_name TEXT,
  page_title TEXT,
  meta_description TEXT,
  ai_summary TEXT,
  brand_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  typography JSONB NOT NULL DEFAULT '[]'::jsonb,
  outbound_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url TEXT,
  logo_user_uploaded BOOLEAN NOT NULL DEFAULT false,
  logo_storage_path TEXT,
  tagline TEXT,
  brand_values TEXT[] NOT NULL DEFAULT '{}'::text[],
  brand_aesthetic TEXT,
  brand_tone TEXT,
  brand_tone_is_custom BOOLEAN NOT NULL DEFAULT false,
  brand_archetype TEXT,
  brand_archetype_is_custom BOOLEAN NOT NULL DEFAULT false,
  last_ai_enhanced_at TIMESTAMPTZ,
  ai_enhancement_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_summary TO authenticated;
GRANT ALL ON public.brand_summary TO service_role;

ALTER TABLE public.brand_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_summary_select_own" ON public.brand_summary
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "brand_summary_insert_own" ON public.brand_summary
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_summary_update_own" ON public.brand_summary
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_summary_delete_own" ON public.brand_summary
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brand_summary_website_url ON public.brand_summary(website_url);

CREATE TRIGGER brand_summary_set_updated_at
  BEFORE UPDATE ON public.brand_summary
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
