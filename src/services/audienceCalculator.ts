import type { CountryData, PlatformData } from "@/data/audienceIntelligenceData";
import { INTEREST_CATEGORIES } from "@/data/audienceIntelligenceData";
import type { CalculatedMetrics, PlatformId, WorldBankData } from "@/types/audience";

export const formatNumber = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toString();
};

const PLATFORM_KEYS: Exclude<PlatformId, "all">[] = [
  "facebook",
  "tiktok",
  "youtube",
  "instagram",
  "whatsapp",
  "linkedin",
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

export const calculateMetrics = (
  country: CountryData,
  platform: PlatformId,
  interestId: string,
  wb: WorldBankData | null,
): CalculatedMetrics => {
  const interest = getInterest(interestId);

  // Platform audience
  let platformAudience = country.socialMediaUsers;
  let platformAudienceLabel = `Total ${country.name} social media users`;
  if (platform !== "all") {
    const p = country.platforms[platform];
    platformAudience = p.monthlyActiveUsers;
    platformAudienceLabel = `Total ${platform[0].toUpperCase() + platform.slice(1)} users in ${country.name}`;
  }

  // Internet
  const totalPopulation = wb?.population || country.population;
  const internetPenetration = wb?.internetPenetration || country.internetPenetration;
  const internetUsers = Math.round((totalPopulation * internetPenetration) / 100);

  // Addressable audience
  const baseReach = platform === "all" ? country.socialMediaUsers : country.platforms[platform].monthlyActiveUsers ?? 0;
  const addressableAudience = Math.round((baseReach * interest.basePercent) / 100);

  // YoY growth (avg across ad platforms with reach > 0)
  const growths = PLATFORM_KEYS.map((k) => {
    const p = country.platforms[k] as PlatformData;
    return p && p.monthlyActiveUsers > 0 ? p.yoyGrowth : null;
  }).filter((v): v is number => v !== null);
  const avgYoyGrowth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;

  // Opportunity score: blend penetration (40), social penetration (30), growth (30)
  const penScore = Math.min(100, internetPenetration) * 0.4;
  const socialScore = Math.min(100, country.socialPenetration) * 0.3;
  const growthScore = Math.max(0, Math.min(30, avgYoyGrowth + 5)) * 1.0; // up to 30
  const opportunityScore = Math.round(penScore + socialScore + growthScore);

  let opportunityLabel: CalculatedMetrics["opportunityLabel"];
  if (opportunityScore >= 80) opportunityLabel = "Excellent";
  else if (opportunityScore >= 60) opportunityLabel = "Good";
  else if (opportunityScore >= 40) opportunityLabel = "Moderate";
  else opportunityLabel = "Limited";

  const opportunityKeyFactor =
    avgYoyGrowth > 10
      ? `High growth (+${avgYoyGrowth.toFixed(1)}% YoY)`
      : internetPenetration > 70
        ? `Strong internet base (${internetPenetration.toFixed(0)}%)`
        : `Emerging market (${internetPenetration.toFixed(0)}% online)`;

  return {
    platformAudience,
    platformAudienceLabel,
    internetUsers,
    internetPenetration,
    totalPopulation,
    addressableAudience,
    interestPercent: interest.basePercent,
    avgYoyGrowth,
    opportunityScore: Math.min(100, opportunityScore),
    opportunityLabel,
    opportunityKeyFactor,
  };
};
