import type { WorldBankData } from "@/types/audience";

const WB_BASE = "https://api.worldbank.org/v2";

const pickLatest = (json: unknown): { value: number; date: string } => {
  if (!Array.isArray(json) || !Array.isArray(json[1])) return { value: 0, date: "" };
  const rows = json[1] as Array<{ value: number | null; date: string }>;
  const row = rows.find((r) => r?.value !== null && r?.value !== undefined);
  return { value: row?.value ?? 0, date: row?.date ?? "" };
};

export const fetchWorldBankData = async (countryCode: string): Promise<WorldBankData> => {
  const indicators = [
    "IT.NET.USER.ZS",
    "SP.POP.TOTL",
    "SP.URB.TOTL.IN.ZS",
    "NY.GDP.PCAP.CD",
  ];
  const responses = await Promise.all(
    indicators.map((ind) =>
      fetch(`${WB_BASE}/country/${countryCode}/indicator/${ind}?format=json&mrv=1`).then((r) => r.json()),
    ),
  );
  const [pen, pop, urb, gdp] = responses.map(pickLatest);
  return {
    internetPenetration: pen.value,
    population: pop.value,
    urbanPopulation: urb.value,
    gdpPerCapita: gdp.value,
    lastUpdated: pen.date || "2023",
  };
};
