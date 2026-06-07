export type BrandColor = {
  role: string;
  hex: string;
  label: string;
  user_customized?: boolean;
};

export type TypographyEntry = {
  font: string;
  usage: string;
};

export type AIEnhancementHistoryEntry = {
  field: string;
  original: string;
  enhanced: string;
  timestamp: string;
};

export type BrandSummary = {
  id?: string;
  user_id?: string;
  website_url: string | null;
  brand_name: string | null;
  page_title: string | null;
  meta_description: string | null;
  ai_summary: string | null;
  brand_colors: BrandColor[];
  typography: TypographyEntry[];
  outbound_links: string[];
  logo_url: string | null;
  logo_user_uploaded: boolean;
  logo_storage_path: string | null;
  tagline: string | null;
  brand_values: string[];
  brand_aesthetic: string | null;
  brand_tone: string | null;
  brand_tone_is_custom: boolean;
  brand_archetype: string | null;
  brand_archetype_is_custom: boolean;
  last_ai_enhanced_at: string | null;
  ai_enhancement_history: AIEnhancementHistoryEntry[];
  last_scraped_at: string | null;
};

export const EMPTY_BRAND_SUMMARY: BrandSummary = {
  website_url: null,
  brand_name: null,
  page_title: null,
  meta_description: null,
  ai_summary: null,
  brand_colors: [],
  typography: [],
  outbound_links: [],
  logo_url: null,
  logo_user_uploaded: false,
  logo_storage_path: null,
  tagline: null,
  brand_values: [],
  brand_aesthetic: null,
  brand_tone: null,
  brand_tone_is_custom: false,
  brand_archetype: null,
  brand_archetype_is_custom: false,
  last_ai_enhanced_at: null,
  ai_enhancement_history: [],
  last_scraped_at: null,
};

export const BRAND_TONE_OPTIONS = [
  "Professional",
  "Friendly",
  "Bold & Edgy",
  "Playful",
  "Inspirational",
  "Luxury",
  "Technical",
  "Empathetic",
] as const;

export const BRAND_ARCHETYPE_OPTIONS: Array<{ name: string; description: string }> = [
  { name: "The Explorer", description: "Adventurous, free, pioneering" },
  { name: "The Jester", description: "Playful, fun, lives in the moment" },
  { name: "The Ruler", description: "Authoritative, leading, prestigious" },
  { name: "The Rebel", description: "Challenging norms, disruptive" },
  { name: "The Lover", description: "Passionate, intimate, relationship-led" },
  { name: "The Innocent", description: "Optimistic, simple, wholesome" },
  { name: "The Everyperson", description: "Relatable, humble, grounded" },
  { name: "The Magician", description: "Transformative, visionary, inspiring" },
  { name: "The Hero", description: "Courageous, determined, inspires achievement" },
  { name: "The Coach", description: "Supportive, growth-oriented, motivational" },
  { name: "The Scholar", description: "Expertise-led, research-driven" },
  { name: "The Empowerer", description: "Unlocks potential, confidence-building" },
  { name: "The Pathfinder", description: "Helps learners discover opportunities" },
  { name: "The Sage", description: "Wise, knowledgeable, analytical" },
  { name: "The Creator", description: "Innovative, imaginative, expressive" },
  { name: "The Caregiver", description: "Nurturing, compassionate, supportive" },
  { name: "The Outlaw", description: "Rebellious, provocative, revolutionary" },
  { name: "The Mentor", description: "Guiding, educational, empowering" },
  { name: "The Citizen", description: "Trustworthy, community-focused, dependable" },
];

export type EnhanceableField =
  | "ai_summary"
  | "tagline"
  | "brand_values"
  | "brand_aesthetic"
  | "meta_description"
  | "page_title"
  | "brand_name"
  | "brand_tone"
  | "brand_archetype";

export const ALLOWED_UPDATE_FIELDS = [
  "ai_summary",
  "tagline",
  "brand_values",
  "brand_aesthetic",
  "brand_tone",
  "brand_tone_is_custom",
  "brand_archetype",
  "brand_archetype_is_custom",
  "brand_colors",
  "typography",
  "logo_url",
  "logo_user_uploaded",
  "logo_storage_path",
  "meta_description",
  "page_title",
  "brand_name",
  "website_url",
  "outbound_links",
] as const;
