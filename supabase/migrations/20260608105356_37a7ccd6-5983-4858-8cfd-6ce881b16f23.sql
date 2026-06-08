
-- ============ creative_generations ============
CREATE TABLE public.creative_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  version TEXT DEFAULT 'v1',
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_type TEXT NOT NULL,
  output_content TEXT,
  output_image_url TEXT,
  output_image_urls TEXT[],
  model_used TEXT NOT NULL,
  prompt_used TEXT,
  generation_time_ms INTEGER,
  quality_score DECIMAL(3,1),
  token_count INTEGER,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  is_favorite BOOLEAN DEFAULT false,
  campaign_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creative_generations TO authenticated;
GRANT ALL ON public.creative_generations TO service_role;
ALTER TABLE public.creative_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cg_select_own" ON public.creative_generations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cg_insert_own" ON public.creative_generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cg_update_own" ON public.creative_generations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cg_delete_own" ON public.creative_generations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_creative_generations_user_module ON public.creative_generations(user_id, module, created_at DESC);
CREATE INDEX idx_creative_generations_status ON public.creative_generations(status);
CREATE TRIGGER cg_updated BEFORE UPDATE ON public.creative_generations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ creative_context_memory ============
CREATE TABLE public.creative_context_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_context JSONB,
  last_topics TEXT[],
  preferred_tone TEXT,
  style_history JSONB,
  industry TEXT,
  audience_profile JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creative_context_memory TO authenticated;
GRANT ALL ON public.creative_context_memory TO service_role;
ALTER TABLE public.creative_context_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccm_select_own" ON public.creative_context_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ccm_insert_own" ON public.creative_context_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ccm_update_own" ON public.creative_context_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ccm_updated BEFORE UPDATE ON public.creative_context_memory FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ seo_keyword_cache ============
CREATE TABLE public.seo_keyword_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_keyword TEXT NOT NULL,
  suggestions JSONB NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);
GRANT SELECT ON public.seo_keyword_cache TO authenticated;
GRANT ALL ON public.seo_keyword_cache TO service_role;
ALTER TABLE public.seo_keyword_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skc_read_all_auth" ON public.seo_keyword_cache FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_seo_keyword_seed ON public.seo_keyword_cache(seed_keyword, language);

-- ============ blog_attachments ============
CREATE TABLE public.blog_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.creative_generations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.blog_attachments TO authenticated;
GRANT ALL ON public.blog_attachments TO service_role;
ALTER TABLE public.blog_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_select_own" ON public.blog_attachments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ba_insert_own" ON public.blog_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ba_delete_own" ON public.blog_attachments FOR DELETE TO authenticated USING (auth.uid() = user_id);
