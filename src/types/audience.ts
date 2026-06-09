export type PlatformId = "all" | "facebook" | "tiktok" | "youtube" | "instagram" | "whatsapp" | "linkedin";

export interface WorldBankData {
  internetPenetration: number;
  population: number;
  urbanPopulation: number;
  gdpPerCapita: number;
  lastUpdated: string;
}

export interface CalculatedMetrics {
  platformAudience: number;
  platformAudienceLabel: string;
  internetUsers: number;
  internetPenetration: number;
  totalPopulation: number;
  addressableAudience: number;
  interestPercent: number;
  avgYoyGrowth: number;
  opportunityScore: number;
  opportunityLabel: "Excellent" | "Good" | "Moderate" | "Limited";
  opportunityKeyFactor: string;
}
