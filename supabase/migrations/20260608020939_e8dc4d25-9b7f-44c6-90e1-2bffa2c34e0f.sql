
CREATE TABLE public.brand_guideline_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_summary_id UUID REFERENCES public.brand_summary(id) ON DELETE SET NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf','ppt','docx','web')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','complete','error')),
  generation_progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  file_url TEXT,
  file_storage_path TEXT,
  web_book_slug TEXT,
  file_size_bytes INTEGER,
  sections_count INTEGER,
  generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_guideline_generations TO authenticated;
GRANT ALL ON public.brand_guideline_generations TO service_role;
ALTER TABLE public.brand_guideline_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bgg_own_select" ON public.brand_guideline_generations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bgg_own_insert" ON public.brand_guideline_generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bgg_own_update" ON public.brand_guideline_generations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bgg_own_delete" ON public.brand_guideline_generations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER bgg_set_updated_at BEFORE UPDATE ON public.brand_guideline_generations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_bgg_user ON public.brand_guideline_generations(user_id, created_at DESC);
CREATE INDEX idx_bgg_status ON public.brand_guideline_generations(status);

CREATE TABLE public.web_brand_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES public.brand_guideline_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  brand_data JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.web_brand_books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_brand_books TO authenticated;
GRANT ALL ON public.web_brand_books TO service_role;
ALTER TABLE public.web_brand_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wbb_public_select" ON public.web_brand_books FOR SELECT TO anon, authenticated USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "wbb_own_insert" ON public.web_brand_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wbb_own_update" ON public.web_brand_books FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_wbb_slug ON public.web_brand_books(slug);

ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_guideline_generations;
