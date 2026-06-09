export const DR_SOURCE = "DataReportal 2025 · Annual benchmark";
export const WB_SOURCE = "WorldBank API · Quarterly updated";
export const AI_SOURCE = "Claude AI estimate · Generated per query";
export const CALC_SOURCE = "Calculated from DR + WB data";

export interface PlatformData {
  adReach: number;
  reachPercent: number;
  monthlyActiveUsers: number;
  cpmUSD: number;
  bestFormat: string;
  peakHours: string;
  yoyGrowth: number;
  topAgeGroup: string;
  genderMale: number;
  genderFemale: number;
  engagementRate: number;
}

export interface CountryData {
  name: string;
  flag: string;
  iso2: string;
  iso3: string;
  population: number;
  internetUsers: number;
  internetPenetration: number;
  socialMediaUsers: number;
  socialPenetration: number;
  mobileInternetUsers: number;
  urbanPopulationPercent: number;
  medianAge: number;
  gdpPerCapitaUSD: number;
  platforms: {
    facebook: PlatformData;
    tiktok: PlatformData;
    youtube: PlatformData;
    instagram: PlatformData;
    whatsapp: {
      monthlyActiveUsers: number;
      penetrationPercent: number;
      openRate: number;
      ctr: number;
      cpmUSD: number;
      bestFormat: string;
      peakHours: string;
      yoyGrowth: number;
    };
    linkedin: PlatformData;
  };
  topCities: Array<{
    name: string;
    population: number;
    lat: number;
    lng: number;
    internetPenetrationEstimate: number;
  }>;
}

export const audienceData: Record<string, CountryData> = {
  BD: {
    name: "Bangladesh", flag: "🇧🇩", iso2: "BD", iso3: "BGD",
    population: 172954319, internetUsers: 66854000,
    internetPenetration: 38.7, socialMediaUsers: 44500000,
    socialPenetration: 25.7, mobileInternetUsers: 63200000,
    urbanPopulationPercent: 40.1, medianAge: 28.4, gdpPerCapitaUSD: 2688,
    platforms: {
      facebook: { adReach: 44500000, reachPercent: 26.1,
        monthlyActiveUsers: 44500000, cpmUSD: 0.48,
        bestFormat: "Carousel Ads", peakHours: "8–10pm", yoyGrowth: 4.2,
        topAgeGroup: "18–34", genderMale: 71, genderFemale: 29, engagementRate: 3.8 },
      tiktok: { adReach: 22100000, reachPercent: 12.8,
        monthlyActiveUsers: 22100000, cpmUSD: 0.31,
        bestFormat: "Short Video", peakHours: "9–11pm", yoyGrowth: 18.4,
        topAgeGroup: "16–24", genderMale: 58, genderFemale: 42, engagementRate: 5.9 },
      youtube: { adReach: 38600000, reachPercent: 22.3,
        monthlyActiveUsers: 38600000, cpmUSD: 0.38,
        bestFormat: "Skippable In-Stream", peakHours: "9–11pm", yoyGrowth: 8.1,
        topAgeGroup: "18–34", genderMale: 65, genderFemale: 35, engagementRate: 4.2 },
      instagram: { adReach: 8200000, reachPercent: 4.7,
        monthlyActiveUsers: 8200000, cpmUSD: 0.52,
        bestFormat: "Stories + Reels", peakHours: "7–9pm", yoyGrowth: 12.3,
        topAgeGroup: "18–34", genderMale: 68, genderFemale: 32, engagementRate: 4.7 },
      whatsapp: { monthlyActiveUsers: 45000000, penetrationPercent: 26.0,
        openRate: 94, ctr: 18, cpmUSD: 0.22,
        bestFormat: "Broadcast Message", peakHours: "7–9pm", yoyGrowth: 6.3 },
      linkedin: { adReach: 5800000, reachPercent: 3.4,
        monthlyActiveUsers: 5800000, cpmUSD: 4.20,
        bestFormat: "Sponsored Content", peakHours: "9–11am", yoyGrowth: 6.8,
        topAgeGroup: "25–44", genderMale: 64, genderFemale: 36, engagementRate: 2.1 }
    },
    topCities: [
      { name: "Dhaka", population: 10200000, lat: 23.8103, lng: 90.4125, internetPenetrationEstimate: 72 },
      { name: "Chittagong", population: 3900000, lat: 22.3569, lng: 91.7832, internetPenetrationEstimate: 58 },
      { name: "Sylhet", population: 526412, lat: 24.8949, lng: 91.8687, internetPenetrationEstimate: 51 },
      { name: "Rajshahi", population: 700000, lat: 24.3745, lng: 88.6042, internetPenetrationEstimate: 44 },
      { name: "Khulna", population: 1000000, lat: 22.8456, lng: 89.5403, internetPenetrationEstimate: 38 },
      { name: "Mymensingh", population: 470858, lat: 24.7471, lng: 90.4203, internetPenetrationEstimate: 35 },
      { name: "Barisal", population: 430000, lat: 22.7010, lng: 90.3535, internetPenetrationEstimate: 31 },
      { name: "Rangpur", population: 400000, lat: 25.7439, lng: 89.2752, internetPenetrationEstimate: 28 },
      { name: "Comilla", population: 380000, lat: 23.4607, lng: 91.1809, internetPenetrationEstimate: 43 },
      { name: "Narayanganj", population: 750000, lat: 23.6238, lng: 90.5000, internetPenetrationEstimate: 56 }
    ]
  },
  IN: {
    name: "India", flag: "🇮🇳", iso2: "IN", iso3: "IND",
    population: 1428627663, internetUsers: 900000000,
    internetPenetration: 63.0, socialMediaUsers: 467000000,
    socialPenetration: 32.7, mobileInternetUsers: 855000000,
    urbanPopulationPercent: 36.4, medianAge: 28.2, gdpPerCapitaUSD: 2601,
    platforms: {
      facebook: { adReach: 378000000, reachPercent: 26.5,
        monthlyActiveUsers: 378000000, cpmUSD: 0.51,
        bestFormat: "Video Ads", peakHours: "8–10pm", yoyGrowth: 3.1,
        topAgeGroup: "18–34", genderMale: 72, genderFemale: 28, engagementRate: 3.4 },
      tiktok: { adReach: 0, reachPercent: 0,
        monthlyActiveUsers: 0, cpmUSD: 0,
        bestFormat: "N/A (banned)", peakHours: "N/A", yoyGrowth: 0,
        topAgeGroup: "N/A", genderMale: 0, genderFemale: 0, engagementRate: 0 },
      youtube: { adReach: 462000000, reachPercent: 32.4,
        monthlyActiveUsers: 462000000, cpmUSD: 0.42,
        bestFormat: "In-Stream Video", peakHours: "8–11pm", yoyGrowth: 9.2,
        topAgeGroup: "18–34", genderMale: 64, genderFemale: 36, engagementRate: 4.8 },
      instagram: { adReach: 229000000, reachPercent: 16.0,
        monthlyActiveUsers: 229000000, cpmUSD: 0.58,
        bestFormat: "Reels", peakHours: "7–10pm", yoyGrowth: 15.4,
        topAgeGroup: "18–34", genderMale: 61, genderFemale: 39, engagementRate: 5.1 },
      whatsapp: { monthlyActiveUsers: 487000000, penetrationPercent: 34.1,
        openRate: 96, ctr: 22, cpmUSD: 0.18,
        bestFormat: "Business Messages", peakHours: "6–9pm", yoyGrowth: 7.8 },
      linkedin: { adReach: 101000000, reachPercent: 7.1,
        monthlyActiveUsers: 101000000, cpmUSD: 3.80,
        bestFormat: "Sponsored InMail", peakHours: "9–11am", yoyGrowth: 12.3,
        topAgeGroup: "25–44", genderMale: 68, genderFemale: 32, engagementRate: 2.8 }
    },
    topCities: [
      { name: "Mumbai", population: 20667656, lat: 19.0760, lng: 72.8777, internetPenetrationEstimate: 82 },
      { name: "Delhi", population: 32941000, lat: 28.7041, lng: 77.1025, internetPenetrationEstimate: 79 },
      { name: "Bangalore", population: 13193000, lat: 12.9716, lng: 77.5946, internetPenetrationEstimate: 88 },
      { name: "Hyderabad", population: 10534000, lat: 17.3850, lng: 78.4867, internetPenetrationEstimate: 81 },
      { name: "Chennai", population: 10971000, lat: 13.0827, lng: 80.2707, internetPenetrationEstimate: 78 },
      { name: "Kolkata", population: 14974000, lat: 22.5726, lng: 88.3639, internetPenetrationEstimate: 71 },
      { name: "Pune", population: 7276000, lat: 18.5204, lng: 73.8567, internetPenetrationEstimate: 84 },
      { name: "Ahmedabad", population: 8059000, lat: 23.0225, lng: 72.5714, internetPenetrationEstimate: 76 }
    ]
  },
  NG: {
    name: "Nigeria", flag: "🇳🇬", iso2: "NG", iso3: "NGA",
    population: 218541212, internetUsers: 111456000,
    internetPenetration: 51.0, socialMediaUsers: 33000000,
    socialPenetration: 15.1, mobileInternetUsers: 98000000,
    urbanPopulationPercent: 54.3, medianAge: 18.4, gdpPerCapitaUSD: 2184,
    platforms: {
      facebook: { adReach: 33900000, reachPercent: 15.5,
        monthlyActiveUsers: 33900000, cpmUSD: 0.28,
        bestFormat: "Video Ads", peakHours: "7–10pm", yoyGrowth: 6.8,
        topAgeGroup: "18–34", genderMale: 67, genderFemale: 33, engagementRate: 4.2 },
      tiktok: { adReach: 12400000, reachPercent: 5.7,
        monthlyActiveUsers: 12400000, cpmUSD: 0.19,
        bestFormat: "Short Video", peakHours: "8–11pm", yoyGrowth: 42.1,
        topAgeGroup: "16–24", genderMale: 55, genderFemale: 45, engagementRate: 7.2 },
      youtube: { adReach: 42600000, reachPercent: 19.5,
        monthlyActiveUsers: 42600000, cpmUSD: 0.22,
        bestFormat: "In-Stream", peakHours: "7–10pm", yoyGrowth: 11.3,
        topAgeGroup: "18–34", genderMale: 62, genderFemale: 38, engagementRate: 4.8 },
      instagram: { adReach: 8100000, reachPercent: 3.7,
        monthlyActiveUsers: 8100000, cpmUSD: 0.34,
        bestFormat: "Reels", peakHours: "7–9pm", yoyGrowth: 18.9,
        topAgeGroup: "18–34", genderMale: 58, genderFemale: 42, engagementRate: 5.4 },
      whatsapp: { monthlyActiveUsers: 51000000, penetrationPercent: 23.3,
        openRate: 92, ctr: 16, cpmUSD: 0.14,
        bestFormat: "Broadcast", peakHours: "6–9pm", yoyGrowth: 9.1 },
      linkedin: { adReach: 8700000, reachPercent: 4.0,
        monthlyActiveUsers: 8700000, cpmUSD: 2.10,
        bestFormat: "Sponsored Content", peakHours: "9–11am", yoyGrowth: 14.2,
        topAgeGroup: "25–44", genderMale: 62, genderFemale: 38, engagementRate: 3.1 }
    },
    topCities: [
      { name: "Lagos", population: 15388000, lat: 6.5244, lng: 3.3792, internetPenetrationEstimate: 71 },
      { name: "Kano", population: 4103000, lat: 12.0022, lng: 8.5920, internetPenetrationEstimate: 44 },
      { name: "Ibadan", population: 3649000, lat: 7.3775, lng: 3.9470, internetPenetrationEstimate: 52 },
      { name: "Abuja", population: 3464000, lat: 9.0579, lng: 7.4951, internetPenetrationEstimate: 68 },
      { name: "Port Harcourt", population: 2343000, lat: 4.8156, lng: 7.0498, internetPenetrationEstimate: 58 }
    ]
  },
  ID: {
    name: "Indonesia", flag: "🇮🇩", iso2: "ID", iso3: "IDN",
    population: 277534122, internetUsers: 212900000,
    internetPenetration: 76.8, socialMediaUsers: 167000000,
    socialPenetration: 60.2, mobileInternetUsers: 200000000,
    urbanPopulationPercent: 58.6, medianAge: 29.7, gdpPerCapitaUSD: 4941,
    platforms: {
      facebook: { adReach: 119000000, reachPercent: 43.0,
        monthlyActiveUsers: 119000000, cpmUSD: 0.62,
        bestFormat: "Video + Carousel", peakHours: "8–10pm", yoyGrowth: 2.1,
        topAgeGroup: "18–34", genderMale: 55, genderFemale: 45, engagementRate: 3.9 },
      tiktok: { adReach: 109000000, reachPercent: 39.3,
        monthlyActiveUsers: 109000000, cpmUSD: 0.44,
        bestFormat: "TopView + Short", peakHours: "9–11pm", yoyGrowth: 22.8,
        topAgeGroup: "16–24", genderMale: 48, genderFemale: 52, engagementRate: 6.8 },
      youtube: { adReach: 139000000, reachPercent: 50.1,
        monthlyActiveUsers: 139000000, cpmUSD: 0.51,
        bestFormat: "In-Stream", peakHours: "8–11pm", yoyGrowth: 7.4,
        topAgeGroup: "18–34", genderMale: 57, genderFemale: 43, engagementRate: 4.4 },
      instagram: { adReach: 89000000, reachPercent: 32.1,
        monthlyActiveUsers: 89000000, cpmUSD: 0.71,
        bestFormat: "Reels", peakHours: "7–9pm", yoyGrowth: 11.2,
        topAgeGroup: "18–34", genderMale: 47, genderFemale: 53, engagementRate: 5.6 },
      whatsapp: { monthlyActiveUsers: 86000000, penetrationPercent: 31.0,
        openRate: 93, ctr: 19, cpmUSD: 0.21,
        bestFormat: "Broadcast", peakHours: "7–9pm", yoyGrowth: 5.4 },
      linkedin: { adReach: 22000000, reachPercent: 7.9,
        monthlyActiveUsers: 22000000, cpmUSD: 3.20,
        bestFormat: "Sponsored Content", peakHours: "9–11am", yoyGrowth: 9.8,
        topAgeGroup: "25–44", genderMale: 59, genderFemale: 41, engagementRate: 2.4 }
    },
    topCities: [
      { name: "Jakarta", population: 11249000, lat: -6.2088, lng: 106.8456, internetPenetrationEstimate: 86 },
      { name: "Surabaya", population: 2970000, lat: -7.2575, lng: 112.7521, internetPenetrationEstimate: 81 },
      { name: "Bandung", population: 2575000, lat: -6.9175, lng: 107.6191, internetPenetrationEstimate: 79 },
      { name: "Medan", population: 2435000, lat: 3.5952, lng: 98.6722, internetPenetrationEstimate: 74 },
      { name: "Makassar", population: 1508000, lat: -5.1477, lng: 119.4327, internetPenetrationEstimate: 71 }
    ]
  },
  PH: {
    name: "Philippines", flag: "🇵🇭", iso2: "PH", iso3: "PHL",
    population: 117337368, internetUsers: 86200000,
    internetPenetration: 73.5, socialMediaUsers: 86900000,
    socialPenetration: 74.1, mobileInternetUsers: 81000000,
    urbanPopulationPercent: 47.6, medianAge: 25.7, gdpPerCapitaUSD: 3623,
    platforms: {
      facebook: { adReach: 86700000, reachPercent: 73.9,
        monthlyActiveUsers: 86700000, cpmUSD: 0.55,
        bestFormat: "Video Ads", peakHours: "9–11pm", yoyGrowth: 3.8,
        topAgeGroup: "18–34", genderMale: 49, genderFemale: 51, engagementRate: 5.2 },
      tiktok: { adReach: 42800000, reachPercent: 36.5,
        monthlyActiveUsers: 42800000, cpmUSD: 0.38,
        bestFormat: "Short Video", peakHours: "9–11pm", yoyGrowth: 31.4,
        topAgeGroup: "16–24", genderMale: 44, genderFemale: 56, engagementRate: 7.4 },
      youtube: { adReach: 64100000, reachPercent: 54.6,
        monthlyActiveUsers: 64100000, cpmUSD: 0.44,
        bestFormat: "In-Stream", peakHours: "8–11pm", yoyGrowth: 6.9,
        topAgeGroup: "18–34", genderMale: 51, genderFemale: 49, engagementRate: 4.9 },
      instagram: { adReach: 19500000, reachPercent: 16.6,
        monthlyActiveUsers: 19500000, cpmUSD: 0.61,
        bestFormat: "Reels", peakHours: "8–10pm", yoyGrowth: 14.1,
        topAgeGroup: "18–34", genderMale: 43, genderFemale: 57, engagementRate: 5.8 },
      whatsapp: { monthlyActiveUsers: 11000000, penetrationPercent: 9.4,
        openRate: 88, ctr: 14, cpmUSD: 0.28,
        bestFormat: "Broadcast", peakHours: "7–9pm", yoyGrowth: 4.2 },
      linkedin: { adReach: 13000000, reachPercent: 11.1,
        monthlyActiveUsers: 13000000, cpmUSD: 2.80,
        bestFormat: "Sponsored Content", peakHours: "9–11am", yoyGrowth: 11.4,
        topAgeGroup: "25–44", genderMale: 54, genderFemale: 46, engagementRate: 2.9 }
    },
    topCities: [
      { name: "Manila", population: 1846700, lat: 14.5995, lng: 120.9842, internetPenetrationEstimate: 89 },
      { name: "Quezon City", population: 2936000, lat: 14.6760, lng: 121.0437, internetPenetrationEstimate: 87 },
      { name: "Davao", population: 1776949, lat: 7.1907, lng: 125.4553, internetPenetrationEstimate: 78 },
      { name: "Cebu", population: 964169, lat: 10.3157, lng: 123.8854, internetPenetrationEstimate: 82 }
    ]
  },
  US: {
    name: "United States", flag: "🇺🇸", iso2: "US", iso3: "USA",
    population: 335893238, internetUsers: 311500000,
    internetPenetration: 92.8, socialMediaUsers: 246000000,
    socialPenetration: 73.3, mobileInternetUsers: 290000000,
    urbanPopulationPercent: 82.7, medianAge: 38.5, gdpPerCapitaUSD: 63850,
    platforms: {
      facebook: { adReach: 178000000, reachPercent: 53.0,
        monthlyActiveUsers: 178000000, cpmUSD: 8.60,
        bestFormat: "Video + Carousel", peakHours: "7–9pm", yoyGrowth: -1.2,
        topAgeGroup: "25–44", genderMale: 43, genderFemale: 57, engagementRate: 2.1 },
      tiktok: { adReach: 148000000, reachPercent: 44.1,
        monthlyActiveUsers: 148000000, cpmUSD: 3.80,
        bestFormat: "TopView + Spark", peakHours: "8–10pm", yoyGrowth: 8.4,
        topAgeGroup: "16–24", genderMale: 40, genderFemale: 60, engagementRate: 5.9 },
      youtube: { adReach: 238000000, reachPercent: 70.9,
        monthlyActiveUsers: 238000000, cpmUSD: 7.40,
        bestFormat: "Non-skip In-Stream", peakHours: "7–10pm", yoyGrowth: 3.8,
        topAgeGroup: "18–44", genderMale: 54, genderFemale: 46, engagementRate: 3.8 },
      instagram: { adReach: 138000000, reachPercent: 41.1,
        monthlyActiveUsers: 138000000, cpmUSD: 6.70,
        bestFormat: "Reels + Stories", peakHours: "7–9pm", yoyGrowth: 4.1,
        topAgeGroup: "18–34", genderMale: 44, genderFemale: 56, engagementRate: 3.4 },
      whatsapp: { monthlyActiveUsers: 36000000, penetrationPercent: 10.7,
        openRate: 78, ctr: 11, cpmUSD: 1.80,
        bestFormat: "Business API", peakHours: "6–8pm", yoyGrowth: 3.1 },
      linkedin: { adReach: 212000000, reachPercent: 63.2,
        monthlyActiveUsers: 212000000, cpmUSD: 11.50,
        bestFormat: "Sponsored Content", peakHours: "8–10am", yoyGrowth: 5.2,
        topAgeGroup: "25–44", genderMale: 54, genderFemale: 46, engagementRate: 2.2 }
    },
    topCities: [
      { name: "New York", population: 8336817, lat: 40.7128, lng: -74.0060, internetPenetrationEstimate: 96 },
      { name: "Los Angeles", population: 3979576, lat: 34.0522, lng: -118.2437, internetPenetrationEstimate: 94 },
      { name: "Chicago", population: 2693976, lat: 41.8781, lng: -87.6298, internetPenetrationEstimate: 93 },
      { name: "Houston", population: 2320268, lat: 29.7604, lng: -95.3698, internetPenetrationEstimate: 91 },
      { name: "Phoenix", population: 1680992, lat: 33.4484, lng: -112.0740, internetPenetrationEstimate: 92 }
    ]
  },
  AE: {
    name: "UAE", flag: "🇦🇪", iso2: "AE", iso3: "ARE",
    population: 9516000, internetUsers: 9300000,
    internetPenetration: 97.8, socialMediaUsers: 9800000,
    socialPenetration: 103.0, mobileInternetUsers: 9200000,
    urbanPopulationPercent: 87.3, medianAge: 38.8, gdpPerCapitaUSD: 43100,
    platforms: {
      facebook: { adReach: 8200000, reachPercent: 86.2,
        monthlyActiveUsers: 8200000, cpmUSD: 4.10,
        bestFormat: "Video Ads", peakHours: "8–11pm", yoyGrowth: 1.4,
        topAgeGroup: "25–44", genderMale: 71, genderFemale: 29, engagementRate: 3.1 },
      tiktok: { adReach: 5200000, reachPercent: 54.6,
        monthlyActiveUsers: 5200000, cpmUSD: 2.80,
        bestFormat: "Short Video", peakHours: "9–11pm", yoyGrowth: 24.1,
        topAgeGroup: "18–34", genderMale: 58, genderFemale: 42, engagementRate: 6.4 },
      youtube: { adReach: 8800000, reachPercent: 92.5,
        monthlyActiveUsers: 8800000, cpmUSD: 3.60,
        bestFormat: "In-Stream", peakHours: "8–10pm", yoyGrowth: 5.8,
        topAgeGroup: "18–44", genderMale: 66, genderFemale: 34, engagementRate: 4.1 },
      instagram: { adReach: 8100000, reachPercent: 85.1,
        monthlyActiveUsers: 8100000, cpmUSD: 3.90,
        bestFormat: "Stories + Reels", peakHours: "8–10pm", yoyGrowth: 7.2,
        topAgeGroup: "18–34", genderMale: 60, genderFemale: 40, engagementRate: 4.8 },
      whatsapp: { monthlyActiveUsers: 7900000, penetrationPercent: 83.0,
        openRate: 96, ctr: 24, cpmUSD: 0.48,
        bestFormat: "Business Messages", peakHours: "7–9pm", yoyGrowth: 4.8 },
      linkedin: { adReach: 5400000, reachPercent: 56.7,
        monthlyActiveUsers: 5400000, cpmUSD: 7.20,
        bestFormat: "Sponsored InMail", peakHours: "9–11am", yoyGrowth: 8.4,
        topAgeGroup: "25–44", genderMale: 69, genderFemale: 31, engagementRate: 3.2 }
    },
    topCities: [
      { name: "Dubai", population: 3478000, lat: 25.2048, lng: 55.2708, internetPenetrationEstimate: 99 },
      { name: "Abu Dhabi", population: 1482000, lat: 24.4539, lng: 54.3773, internetPenetrationEstimate: 98 },
      { name: "Sharjah", population: 1274000, lat: 25.3463, lng: 55.4209, internetPenetrationEstimate: 97 }
    ]
  },
  GB: {
    name: "United Kingdom", flag: "🇬🇧", iso2: "GB", iso3: "GBR",
    population: 67736802, internetUsers: 64400000,
    internetPenetration: 95.1, socialMediaUsers: 56200000,
    socialPenetration: 83.0, mobileInternetUsers: 60000000,
    urbanPopulationPercent: 84.2, medianAge: 40.7, gdpPerCapitaUSD: 46371,
    platforms: {
      facebook: { adReach: 35100000, reachPercent: 51.9,
        monthlyActiveUsers: 35100000, cpmUSD: 5.80,
        bestFormat: "Video Ads", peakHours: "7–9pm", yoyGrowth: -2.1,
        topAgeGroup: "25–44", genderMale: 44, genderFemale: 56, engagementRate: 2.4 },
      tiktok: { adReach: 23400000, reachPercent: 34.6,
        monthlyActiveUsers: 23400000, cpmUSD: 2.90,
        bestFormat: "TopView", peakHours: "8–10pm", yoyGrowth: 11.8,
        topAgeGroup: "16–24", genderMale: 42, genderFemale: 58, engagementRate: 5.8 },
      youtube: { adReach: 49600000, reachPercent: 73.3,
        monthlyActiveUsers: 49600000, cpmUSD: 5.20,
        bestFormat: "Non-skip", peakHours: "7–9pm", yoyGrowth: 3.4,
        topAgeGroup: "18–44", genderMale: 52, genderFemale: 48, engagementRate: 3.6 },
      instagram: { adReach: 31800000, reachPercent: 47.0,
        monthlyActiveUsers: 31800000, cpmUSD: 4.80,
        bestFormat: "Reels", peakHours: "7–9pm", yoyGrowth: 5.9,
        topAgeGroup: "18–34", genderMale: 43, genderFemale: 57, engagementRate: 3.8 },
      whatsapp: { monthlyActiveUsers: 32400000, penetrationPercent: 47.9,
        openRate: 84, ctr: 15, cpmUSD: 1.40,
        bestFormat: "Business", peakHours: "6–8pm", yoyGrowth: 3.9 },
      linkedin: { adReach: 38100000, reachPercent: 56.3,
        monthlyActiveUsers: 38100000, cpmUSD: 8.40,
        bestFormat: "Sponsored Content", peakHours: "8–10am", yoyGrowth: 4.8,
        topAgeGroup: "25–44", genderMale: 51, genderFemale: 49, engagementRate: 2.6 }
    },
    topCities: [
      { name: "London", population: 9541000, lat: 51.5074, lng: -0.1278, internetPenetrationEstimate: 97 },
      { name: "Birmingham", population: 1144900, lat: 52.4862, lng: -1.8904, internetPenetrationEstimate: 95 },
      { name: "Manchester", population: 553230, lat: 53.4808, lng: -2.2426, internetPenetrationEstimate: 96 },
      { name: "Glasgow", population: 635640, lat: 55.8642, lng: -4.2518, internetPenetrationEstimate: 95 }
    ]
  },
  BR: {
    name: "Brazil", flag: "🇧🇷", iso2: "BR", iso3: "BRA",
    population: 215313498, internetUsers: 181800000,
    internetPenetration: 84.4, socialMediaUsers: 144000000,
    socialPenetration: 66.9, mobileInternetUsers: 172000000,
    urbanPopulationPercent: 87.6, medianAge: 33.5, gdpPerCapitaUSD: 10070,
    platforms: {
      facebook: { adReach: 111000000, reachPercent: 51.6,
        monthlyActiveUsers: 111000000, cpmUSD: 1.20,
        bestFormat: "Video", peakHours: "7–10pm", yoyGrowth: 1.8,
        topAgeGroup: "25–44", genderMale: 46, genderFemale: 54, engagementRate: 3.8 },
      tiktok: { adReach: 82700000, reachPercent: 38.4,
        monthlyActiveUsers: 82700000, cpmUSD: 0.88,
        bestFormat: "Short Video", peakHours: "8–11pm", yoyGrowth: 28.4,
        topAgeGroup: "16–24", genderMale: 42, genderFemale: 58, engagementRate: 7.1 },
      youtube: { adReach: 144000000, reachPercent: 66.9,
        monthlyActiveUsers: 144000000, cpmUSD: 1.10,
        bestFormat: "In-Stream", peakHours: "7–10pm", yoyGrowth: 6.1,
        topAgeGroup: "18–34", genderMale: 52, genderFemale: 48, engagementRate: 4.6 },
      instagram: { adReach: 113000000, reachPercent: 52.5,
        monthlyActiveUsers: 113000000, cpmUSD: 1.40,
        bestFormat: "Reels", peakHours: "7–9pm", yoyGrowth: 9.4,
        topAgeGroup: "18–34", genderMale: 41, genderFemale: 59, engagementRate: 5.4 },
      whatsapp: { monthlyActiveUsers: 165000000, penetrationPercent: 76.6,
        openRate: 97, ctr: 26, cpmUSD: 0.31,
        bestFormat: "Broadcast + API", peakHours: "6–9pm", yoyGrowth: 6.8 },
      linkedin: { adReach: 61000000, reachPercent: 28.3,
        monthlyActiveUsers: 61000000, cpmUSD: 2.40,
        bestFormat: "Sponsored Content", peakHours: "9–11am", yoyGrowth: 10.2,
        topAgeGroup: "25–44", genderMale: 54, genderFemale: 46, engagementRate: 2.8 }
    },
    topCities: [
      { name: "São Paulo", population: 12325000, lat: -23.5505, lng: -46.6333, internetPenetrationEstimate: 92 },
      { name: "Rio de Janeiro", population: 6748000, lat: -22.9068, lng: -43.1729, internetPenetrationEstimate: 90 },
      { name: "Brasília", population: 3055000, lat: -15.7975, lng: -47.8919, internetPenetrationEstimate: 94 },
      { name: "Salvador", population: 2886000, lat: -12.9714, lng: -38.5014, internetPenetrationEstimate: 84 }
    ]
  },
  PK: {
    name: "Pakistan", flag: "🇵🇰", iso2: "PK", iso3: "PAK",
    population: 231402117, internetUsers: 87000000,
    internetPenetration: 37.6, socialMediaUsers: 47600000,
    socialPenetration: 20.6, mobileInternetUsers: 82000000,
    urbanPopulationPercent: 36.7, medianAge: 22.7, gdpPerCapitaUSD: 1596,
    platforms: {
      facebook: { adReach: 47300000, reachPercent: 20.4,
        monthlyActiveUsers: 47300000, cpmUSD: 0.22,
        bestFormat: "Video Ads", peakHours: "8–10pm", yoyGrowth: 7.4,
        topAgeGroup: "18–34", genderMale: 78, genderFemale: 22, engagementRate: 4.8 },
      tiktok: { adReach: 28100000, reachPercent: 12.1,
        monthlyActiveUsers: 28100000, cpmUSD: 0.18,
        bestFormat: "Short Video", peakHours: "9–11pm", yoyGrowth: 38.2,
        topAgeGroup: "16–24", genderMale: 62, genderFemale: 38, engagementRate: 6.9 },
      youtube: { adReach: 52000000, reachPercent: 22.5,
        monthlyActiveUsers: 52000000, cpmUSD: 0.28,
        bestFormat: "In-Stream", peakHours: "8–11pm", yoyGrowth: 12.1,
        topAgeGroup: "18–34", genderMale: 68, genderFemale: 32, engagementRate: 4.4 },
      instagram: { adReach: 14800000, reachPercent: 6.4,
        monthlyActiveUsers: 14800000, cpmUSD: 0.31,
        bestFormat: "Reels", peakHours: "7–9pm", yoyGrowth: 18.6,
        topAgeGroup: "18–34", genderMale: 71, genderFemale: 29, engagementRate: 4.9 },
      whatsapp: { monthlyActiveUsers: 44000000, penetrationPercent: 19.0,
        openRate: 91, ctr: 16, cpmUSD: 0.14,
        bestFormat: "Broadcast", peakHours: "7–9pm", yoyGrowth: 8.2 },
      linkedin: { adReach: 12400000, reachPercent: 5.4,
        monthlyActiveUsers: 12400000, cpmUSD: 1.80,
        bestFormat: "Sponsored Content", peakHours: "9–11am", yoyGrowth: 9.4,
        topAgeGroup: "25–44", genderMale: 74, genderFemale: 26, engagementRate: 2.6 }
    },
    topCities: [
      { name: "Karachi", population: 16618000, lat: 24.8607, lng: 67.0011, internetPenetrationEstimate: 62 },
      { name: "Lahore", population: 13979000, lat: 31.5204, lng: 74.3587, internetPenetrationEstimate: 58 },
      { name: "Islamabad", population: 1162000, lat: 33.6844, lng: 73.0479, internetPenetrationEstimate: 74 },
      { name: "Faisalabad", population: 3675000, lat: 31.4187, lng: 73.0791, internetPenetrationEstimate: 44 }
    ]
  }
};

export const INTEREST_CATEGORIES = [
  { id: "fitness", label: "Fitness Enthusiasts", basePercent: 9.4, trend: "growing" },
  { id: "tech", label: "Tech Early Adopters", basePercent: 13.7, trend: "growing" },
  { id: "fashion", label: "Fashion & Style", basePercent: 11.2, trend: "growing" },
  { id: "food", label: "Foodies & Home Cooks", basePercent: 14.8, trend: "stable" },
  { id: "business", label: "Small Business Owners", basePercent: 8.6, trend: "growing" },
  { id: "gaming", label: "Gamers (18–35)", basePercent: 16.4, trend: "growing" },
  { id: "parents", label: "New Parents", basePercent: 6.8, trend: "stable" },
  { id: "eco", label: "Eco-conscious Consumers", basePercent: 5.9, trend: "growing" },
  { id: "travel", label: "Travel Enthusiasts", basePercent: 10.1, trend: "stable" },
  { id: "finance", label: "Finance & Investment", basePercent: 7.2, trend: "growing" },
  { id: "beauty", label: "Beauty & Skincare", basePercent: 9.8, trend: "growing" },
  { id: "health", label: "Health & Wellness", basePercent: 11.4, trend: "growing" },
  { id: "education", label: "Online Learners", basePercent: 12.1, trend: "growing" },
  { id: "luxury", label: "Luxury Consumers", basePercent: 4.2, trend: "stable" },
  { id: "saas", label: "SaaS Founders", basePercent: 2.8, trend: "growing" }
];
