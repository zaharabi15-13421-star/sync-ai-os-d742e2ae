CREATE TABLE public.brand_summary_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  logo_url text,
  tagline text,
  brand_values text[] NOT NULL DEFAULT '{}',
  brand_aesthetic text[] NOT NULL DEFAULT '{}',
  brand_tone text[] NOT NULL DEFAULT '{}',
  brand_archetype jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_summary_extras TO authenticated;
GRANT ALL ON public.brand_summary_extras TO service_role;

ALTER TABLE public.brand_summary_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bse_select_own" ON public.brand_summary_extras FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bse_insert_own" ON public.brand_summary_extras FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bse_update_own" ON public.brand_summary_extras FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bse_delete_own" ON public.brand_summary_extras FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_bse_updated_at BEFORE UPDATE ON public.brand_summary_extras
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();