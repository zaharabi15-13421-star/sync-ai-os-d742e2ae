export type DayKey = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export interface DayHours {
  open: boolean;
  start: string;
  end: string;
}

export type BusinessHours = Record<DayKey, DayHours>;

export interface BrandDetails {
  id?: string;
  user_id?: string;
  address_lines: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country_region_code: string | null;
  phone_number: string | null;
  business_hours_not_applicable: boolean;
  business_hours: BusinessHours | Record<string, never>;
  keywords: string[];
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin_personal: string | null;
  social_linkedin_company: string | null;
  social_twitter: string | null;
  social_youtube_channel: string | null;
  social_youtube_user: string | null;
  social_tiktok: string | null;
  social_pinterest: string | null;
  testimonial_1: string | null;
  testimonial_2: string | null;
  testimonial_3: string | null;
  testimonial_4: string | null;
  cta_business_email: string | null;
  cta_appointment_url: string | null;
  cta_order_ahead_url: string | null;
  cta_reservation_url: string | null;
  cta_shop_online_url: string | null;
  cta_custom_url: string | null;
}

export const EMPTY_BRAND_DETAILS: BrandDetails = {
  address_lines: null,
  city: null,
  state_province: null,
  postal_code: null,
  country_region_code: null,
  phone_number: null,
  business_hours_not_applicable: false,
  business_hours: {},
  keywords: [],
  social_facebook: null,
  social_instagram: null,
  social_linkedin_personal: null,
  social_linkedin_company: null,
  social_twitter: null,
  social_youtube_channel: null,
  social_youtube_user: null,
  social_tiktok: null,
  social_pinterest: null,
  testimonial_1: null,
  testimonial_2: null,
  testimonial_3: null,
  testimonial_4: null,
  cta_business_email: null,
  cta_appointment_url: null,
  cta_order_ahead_url: null,
  cta_reservation_url: null,
  cta_shop_online_url: null,
  cta_custom_url: null,
};

export const DAY_ORDER: DayKey[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

export const DAY_LABEL: Record<DayKey, string> = {
  sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday",
};
