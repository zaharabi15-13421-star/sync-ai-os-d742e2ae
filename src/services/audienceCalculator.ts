import type { CountryData, PlatformData } from "@/data/audienceIntelligenceData";
import { INTEREST_CATEGORIES } from "@/data/audienceIntelligenceData";
import type { CalculatedMetrics, PlatformId, WorldBankData } from "@/types/audience";

export type DateRangePreset = "7d" | "1m" | "3m" | "1y" | "custom";
export interface CustomDateRange { from: Date; to: Date }

export const formatNumber = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toString();
};

const PLATFORM_KEYS: Exclude<PlatformId, "all">[] = [
  "facebook", "tiktok", "youtube", "instagram", "whatsapp", "linkedin",
];

export const getInterest = (id: string) =>
  INTEREST_CATEGORIES.find((i) => i.id === id) ?? INTEREST_CATEGORIES[0];

export const getPlatformData = (
  country: CountryData,
  platform: PlatformId,
): PlatformData | null => {
  if (platform === "all" || platform === "whatsapp") return null;
  return country.platforms[platform] as PlatformData;
};

// Per-platform interest affinity multipliers
const PLATFORM_INTEREST_AFFINITY: Record<string, Record<string, number>> = {
  tiktok: { fitness: 1.4, gaming: 1.8, fashion: 1.6, beauty: 1.7, food: 1.3 },
  instagram: { fashion: 1.8, beauty: 1.9, travel: 1.6, food: 1.5, fitness: 1.3 },
  youtube: { gaming: 1.7, tech: 1.5, education: 1.8, fitness: 1.2, food: 1.4 },
  facebook: { parents: 1.6, food: 1.3, travel: 1.4, business: 1.3 },
};

const PLATFORM_OPPORTUNITY_BOOST: Record<string, number> = {
  all: 0, facebook: 2, instagram: 8, tiktok: 15, youtube: 6,
};

export const getDateModulation = (
  range: DateRangePreset,
  custom: CustomDateRange | null,
  baseYoy: number,
): { audMult: number; yoy: number; oppMod: number; label: string; note: string } => {
  switch (range) {
    case "7d": return { audMult: 0.85, yoy: baseYoy * 0.25, oppMod: -5, label: "Last 7 Days", note: "7-day estimate (annual ÷ 52)" };
    case "1m": return { audMult: 0.92, yoy: baseYoy * 0.083, oppMod: -3, label: "Last 1 Month", note: "Monthly estimate (annual ÷ 12)" };
    case "3m": return { audMult: 0.95, yoy: baseYoy * 0.25, oppMod: -1, label: "Last 3 Months", note: "Quarterly estimate (annual ÷ 4)" };
    case "1y": return { audMult: 1.0, yoy: baseYoy, oppMod: 0, label: "Last 1 Year", note: "Full annual DR 2025 benchmark" };
    case "custom": {
      if (!custom) return { audMult: 1, yoy: baseYoy, oppMod: 0, label: "Custom", note: "Custom range" };
      const days = Math.max(1, Math.round((custom.to.getTime() - custom.from.getTime()) / 86400000));
      const f = Math.min(days / 365, 1);
      return { audMult: 0.8 + f * 0.2, yoy: baseYoy * f, oppMod: Math.round((f - 1) * 10), label: `${days} days`, note: `Custom range (${days}d of annual data)` };
    }
  }
};

export const calculateMetrics = (
  country: CountryData,
  platform: PlatformId,
  interestIds: string[],
  wb: WorldBankData | null,
  dateRange: DateRangePreset = "1y",
  customRange: CustomDateRange | null = null,
): CalculatedMetrics & { dateNote: string; dateLabel: string } => {
  // Platform audience
  let platformAudience = country.socialMediaUsers;
  let platformAudienceLabel = `Total ${country.name} social media users`;
  if (platform !== "all") {
    const p = country.platforms[platform];
    platformAudience = p.monthlyActiveUsers;
    platformAudienceLabel = `Total ${platform[0].toUpperCase() + platform.slice(1)} users in ${country.name}`;
  }

  const totalPopulation = wb?.population || country.population;
  const internetPenetration = wb?.internetPenetration || country.internetPenetration;
  const internetUsers = Math.round((totalPopulation * internetPenetration) / 100);

  // Multi-interest union percent
  let combinedPct = 0.10;
  if (interestIds.length > 0) {
    const union = interestIds.reduce((acc, id) => {
      const pct = (getInterest(id).basePercent ?? 8) / 100;
      return 1 - (1 - acc) * (1 - pct);
    }, 0);
    combinedPct = Math.min(union, 0.65);
  }

  // Platform-specific affinity
  let affinity = 1.0;
  if (platform !== "all" && interestIds.length > 0) {
    const aff = PLATFORM_INTEREST_AFFINITY[platform] ?? {};
    const factors = interestIds.map((i) => aff[i] ?? 1.0);
    affinity = factors.reduce((a, b) => a + b, 0) / factors.length;
  }

  const baseReach = platform === "all" ? country.socialMediaUsers : country.platforms[platform]?.monthlyActiveUsers ?? 0;
  let addressableAudience = Math.round(baseReach * combinedPct * affinity);

  // YoY
  const growths = PLATFORM_KEYS.map((k) => {
    const p = country.platforms[k] as PlatformData;
    return p && p.monthlyActiveUsers > 0 ? p.yoyGrowth : null;
  }).filter((v): v is number => v !== null);
  let avgYoyGrowth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
  if (platform !== "all") {
    const p = country.platforms[platform];
    if (p && "yoyGrowth" in p) avgYoyGrowth = p.yoyGrowth;
  }

  // Opportunity
  const penScore = Math.min(100, internetPenetration) * 0.4;
  const socialScore = Math.min(100, country.socialPenetration) * 0.3;
  const growthScore = Math.max(0, Math.min(30, avgYoyGrowth + 5));
  let opportunityScore = Math.round(penScore + socialScore + growthScore) + (PLATFORM_OPPORTUNITY_BOOST[platform] ?? 0);

  // Date modulation
  const mod = getDateModulation(dateRange, customRange, avgYoyGrowth);
  addressableAudience = Math.round(addressableAudience * mod.audMult);
  avgYoyGrowth = mod.yoy;
  opportunityScore = Math.max(0, Math.min(100, opportunityScore + mod.oppMod));

  let opportunityLabel: CalculatedMetrics["opportunityLabel"];
  if (opportunityScore >= 80) opportunityLabel = "Excellent";
  else if (opportunityScore >= 60) opportunityLabel = "Good";
  else if (opportunityScore >= 40) opportunityLabel = "Moderate";
  else opportunityLabel = "Limited";

  const opportunityKeyFactor =
    avgYoyGrowth > 10 ? `High growth (+${avgYoyGrowth.toFixed(1)}% YoY)`
    : internetPenetration > 70 ? `Strong internet base (${internetPenetration.toFixed(0)}%)`
    : `Emerging market (${internetPenetration.toFixed(0)}% online)`;

  return {
    platformAudience,
    platformAudienceLabel,
    internetUsers,
    internetPenetration,
    totalPopulation,
    addressableAudience,
    interestPercent: Math.round(combinedPct * 1000) / 10,
    avgYoyGrowth,
    opportunityScore: Math.min(100, opportunityScore),
    opportunityLabel,
    opportunityKeyFactor,
    dateNote: mod.note,
    dateLabel: mod.label,
  };
};
