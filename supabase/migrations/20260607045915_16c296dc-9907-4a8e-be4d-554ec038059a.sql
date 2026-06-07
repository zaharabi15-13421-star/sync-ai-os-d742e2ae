
CREATE TABLE public.brand_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  address_lines TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country_region_code TEXT,

  phone_number TEXT,

  business_hours_not_applicable BOOLEAN NOT NULL DEFAULT false,
  business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,

  keywords TEXT[] NOT NULL DEFAULT '{}',

  social_facebook TEXT,
  social_instagram TEXT,
  social_linkedin_personal TEXT,
  social_linkedin_company TEXT,
  social_twitter TEXT,
  social_youtube_channel TEXT,
  social_youtube_user TEXT,
  social_tiktok TEXT,
  social_pinterest TEXT,

  testimonial_1 TEXT,
  testimonial_2 TEXT,
  testimonial_3 TEXT,
  testimonial_4 TEXT,

  cta_business_email TEXT,
  cta_appointment_url TEXT,
  cta_order_ahead_url TEXT,
  cta_reservation_url TEXT,
  cta_shop_online_url TEXT,
  cta_custom_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_details TO authenticated;
GRANT ALL ON public.brand_details TO service_role;

ALTER TABLE public.brand_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_details_select_own" ON public.brand_details
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "brand_details_insert_own" ON public.brand_details
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_details_update_own" ON public.brand_details
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_details_delete_own" ON public.brand_details
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER brand_details_set_updated_at
  BEFORE UPDATE ON public.brand_details
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
