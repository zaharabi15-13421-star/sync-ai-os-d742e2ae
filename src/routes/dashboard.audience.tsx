import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Search, X, Lock, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  audienceData,
  INTEREST_CATEGORIES,
  type CountryData,
} from "@/data/audienceIntelligenceData";
import { fetchWorldBankData } from "@/services/worldBankAPI";
import {
  calculateMetrics,
  formatNumber,
  getInterest,
} from "@/services/audienceCalculator";
import type { PlatformId, WorldBankData } from "@/types/audience";

export const Route = createFileRoute("/dashboard/audience")({
  component: AudienceIntelligencePage,
});

// ---------- Design tokens (BrandSync AI palette) ----------
const TOKENS = {
  bg: "#050816",
  card: "rgba(18, 14, 38, 0.55)",
  input: "rgba(10, 8, 24, 0.6)",
  border: "rgba(124, 58, 237, 0.22)",
  purple: "#7C3AED",
  purpleLight: "#A78BFA",
  text: "#F5F3FF",
  muted: "#A5B4D4",
  label: "#7A86A8",
  success: "#34D399",
  warning: "#F59E0B",
  danger: "#F472B6",
  info: "#06B6D4",
};

type SourceKind = "DR" | "WB" | "AI" | "CALC";
const SOURCE_META: Record<SourceKind, { color: string; bg: string; full: string }> = {
  DR: { color: "#F0ABFC", bg: "rgba(236,72,153,0.14)", full: "DataReportal 2025 · Annual benchmark" },
  WB: { color: "#67E8F9", bg: "rgba(6,182,212,0.14)", full: "WorldBank API · Quarterly updated" },
  AI: { color: "#C4B5FD", bg: "rgba(124,58,237,0.18)", full: "Claude AI estimate · Generated per query" },
  CALC: { color: "#6EE7B7", bg: "rgba(52,211,153,0.14)", full: "Calculated from DR + WB combined" },
};

function SourceTag({ kind, text }: { kind: SourceKind; text?: string }) {
  const meta = SOURCE_META[kind];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold tracking-wide"
      style={{ background: meta.bg, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {kind} {text ? `· ${text}` : ""}
    </span>
  );
}

// ---------- Page ----------
function AudienceIntelligencePage() {
  const [selectedCountry, setSelectedCountry] = useState("BD");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("all");
  const [selectedYear, setSelectedYear] = useState<"2025" | "2024" | "2023">("2025");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [wbData, setWbData] = useState<WorldBankData | null>(null);
  const [wbLoading, setWbLoading] = useState(false);
  const [wbError, setWbError] = useState(false);

  const country: CountryData = audienceData[selectedCountry] ?? audienceData.BD;
  // Use first selected interest for metric calculations; fall back to a neutral baseline when none selected.
  const primaryInterestId = selectedInterests[0] ?? "business";
  const interest = getInterest(primaryInterestId);


  useEffect(() => {
    let cancelled = false;
    setWbLoading(true);
    setWbError(false);
    fetchWorldBankData(country.iso2)
      .then((d) => {
        if (!cancelled) setWbData(d);
      })
      .catch(() => {
        if (!cancelled) setWbError(true);
      })
      .finally(() => {
        if (!cancelled) setWbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country.iso2]);

  const metrics = useMemo(
    () => calculateMetrics(country, selectedPlatform, primaryInterestId, wbError ? null : wbData),
    [country, selectedPlatform, primaryInterestId, wbData, wbError],
  );


  const filteredInterests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return INTEREST_CATEGORIES;
    return INTEREST_CATEGORIES.filter((i) => i.label.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleExportCsv = () => {
    const rows: string[][] = [
      ["Metric", "Value", "Source"],
      ["Country", country.name, "DR"],
      ["Selected Platform", selectedPlatform, "—"],
      ["Selected Interest", interest.label, "AI"],
      ["Platform Audience", String(metrics.platformAudience), "DR"],
      ["Internet Users", String(metrics.internetUsers), wbError || !wbData ? "DR" : "WB"],
      ["Internet Penetration %", metrics.internetPenetration.toFixed(1), wbError || !wbData ? "DR" : "WB"],
      ["Total Population", String(metrics.totalPopulation), wbError || !wbData ? "DR" : "WB"],
      ["Addressable Audience", String(metrics.addressableAudience), "AI"],
      ["Avg YoY Growth %", metrics.avgYoyGrowth.toFixed(1), "DR"],
      ["Opportunity Score", String(metrics.opportunityScore), "CALC"],
      ["Opportunity Label", metrics.opportunityLabel, "CALC"],
    ];
    for (const city of country.topCities) {
      rows.push([`City: ${city.name}`, `pop ${city.population}, pen ${city.internetPenetrationEstimate}%`, "DR+AI"]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audience-intelligence-${country.iso2}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" style={{ color: TOKENS.text }}>
      <Header onExport={handleExportCsv} />

      <TargetAudienceEngine
        countries={Object.values(audienceData)}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        selectedInterests={selectedInterests}
        onAddInterest={(id) => {
          setSelectedInterests((prev) => (prev.includes(id) ? prev : [...prev, id]));
          setSearchQuery("");
          setShowDropdown(false);
        }}
        onRemoveInterest={(id) =>
          setSelectedInterests((prev) => prev.filter((x) => x !== id))
        }
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}

        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showDropdown={showDropdown}
        onShowDropdown={setShowDropdown}
        filteredInterests={filteredInterests}
      />

      <StatsRow
        metrics={metrics}
        country={country}
        interestLabel={interest.label}
        platform={selectedPlatform}
        wbData={wbData}
        wbLoading={wbLoading}
        wbError={wbError}
        selectedYear={selectedYear}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GeoIntentMap
          country={country}
          interestPercent={metrics.interestPercent}
          wbPenetration={metrics.internetPenetration}
        />
        <AIPredictiveSegments
          country={country}
          interestLabel={interest.label}
          platform={selectedPlatform}
          metrics={metrics}
        />
      </div>

      <PlatformReachGrid country={country} platform={selectedPlatform} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InternetPenetrationChart country={country} wbPenetration={metrics.internetPenetration} />
        <DemographicsPanel country={country} platform={selectedPlatform} />
        <ConversionMatrix country={country} interestId={selectedInterest} />
      </div>

      <TransparencyFooter />
    </div>
  );
}

// ---------- Header ----------
function Header({ onExport }: { onExport: () => void }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: TOKENS.text }}>
            Audience Intelligence
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: TOKENS.muted }}>
            Global audience insights powered by DataReportal 2025 + WorldBank API + AI estimates
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #06B6D4 100%)",
            boxShadow: "0 8px 24px -8px rgba(124,58,237,0.55)",
          }}
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["DR", "WB", "AI", "CALC"] as SourceKind[]).map((k) => (
          <SourceTag key={k} kind={k} text={SOURCE_META[k].full} />
        ))}
      </div>
    </div>
  );
}

// ---------- Target Audience Engine ----------
function TargetAudienceEngine(props: {
  countries: CountryData[];
  selectedCountry: string;
  onCountryChange: (v: string) => void;
  selectedInterest: string;
  onInterestChange: (id: string) => void;
  selectedPlatform: PlatformId;
  onPlatformChange: (p: PlatformId) => void;
  selectedYear: "2025" | "2024" | "2023";
  onYearChange: (y: "2025" | "2024" | "2023") => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  showDropdown: boolean;
  onShowDropdown: (b: boolean) => void;
  filteredInterests: typeof INTEREST_CATEGORIES;
}) {
  const {
    countries,
    selectedCountry,
    onCountryChange,
    selectedInterest,
    onInterestChange,
    selectedPlatform,
    onPlatformChange,
    selectedYear,
    onYearChange,
    searchQuery,
    onSearchChange,
    showDropdown,
    onShowDropdown,
    filteredInterests,
  } = props;

  const interest = getInterest(selectedInterest);
  const country = audienceData[selectedCountry];
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onShowDropdown(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onShowDropdown]);

  const platforms: { id: PlatformId; label: string }[] = [
    { id: "all", label: "ALL" },
    { id: "facebook", label: "Meta" },
    { id: "tiktok", label: "TikTok" },
    { id: "youtube", label: "YouTube" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "linkedin", label: "LinkedIn" },
  ];

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <div ref={wrapRef} className="relative">
          <div
            className="flex items-center gap-2 rounded-[10px] px-3 py-2.5"
            style={{ background: TOKENS.input, border: `1px solid ${TOKENS.border}` }}
          >
            <Search className="h-4 w-4" style={{ color: TOKENS.muted }} />
            <input
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onShowDropdown(true);
              }}
              onFocus={() => onShowDropdown(true)}
              placeholder="Search any interest, behavior, or demographic (e.g. yoga, crypto, SaaS founders, luxury travel)"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[12px]"
              style={{ color: TOKENS.text }}
            />
          </div>
          {showDropdown && (
            <div
              className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-[10px] shadow-xl"
              style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
            >
              {filteredInterests.length === 0 && (
                <div className="px-3 py-2 text-[12px]" style={{ color: TOKENS.muted }}>
                  No matching interests
                </div>
              )}
              {filteredInterests.map((i) => {
                const reachBase = country.socialMediaUsers;
                const audSize = Math.round((reachBase * i.basePercent) / 100);
                const trendIcon =
                  i.trend === "growing" ? (
                    <TrendingUp className="h-3 w-3" style={{ color: TOKENS.success }} />
                  ) : i.trend === "declining" ? (
                    <TrendingDown className="h-3 w-3" style={{ color: TOKENS.danger }} />
                  ) : (
                    <Minus className="h-3 w-3" style={{ color: TOKENS.muted }} />
                  );
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onInterestChange(i.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-white/5"
                    style={{ color: TOKENS.text }}
                  >
                    <span>{i.label}</span>
                    <span className="flex items-center gap-2 text-[11px]" style={{ color: TOKENS.muted }}>
                      ~{formatNumber(audSize)} {trendIcon}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedInterest && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium text-white"
                style={{ background: TOKENS.purple }}
              >
                {interest.label}
                <button
                  type="button"
                  onClick={() => onInterestChange("business")}
                  className="opacity-80 hover:opacity-100"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        <select
          value={selectedCountry}
          onChange={(e) => onCountryChange(e.target.value)}
          className="rounded-[10px] px-3 py-2.5 text-[13px] outline-none"
          style={{
            background: TOKENS.input,
            border: `1px solid ${TOKENS.border}`,
            color: TOKENS.text,
            minWidth: 220,
          }}
        >
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => {
            const active = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPlatformChange(p.id)}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: active ? TOKENS.purple : TOKENS.input,
                  color: active ? "#fff" : TOKENS.muted,
                  border: `1px solid ${active ? TOKENS.purple : TOKENS.border}`,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {(["2025", "2024", "2023"] as const).map((y) => {
            const active = selectedYear === y;
            return (
              <button
                key={y}
                type="button"
                onClick={() => onYearChange(y)}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: active ? TOKENS.purple : TOKENS.input,
                  color: active ? "#fff" : TOKENS.muted,
                  border: `1px solid ${active ? TOKENS.purple : TOKENS.border}`,
                }}
              >
                {y}
              </button>
            );
          })}
        </div>
        <span className="text-[11px]" style={{ color: TOKENS.label }}>
          DataReportal publishes annual reports each January
        </span>
      </div>
    </div>
  );
}

// ---------- Stats Row ----------
function StatsRow(props: {
  metrics: ReturnType<typeof calculateMetrics>;
  country: CountryData;
  interestLabel: string;
  platform: PlatformId;
  wbData: WorldBankData | null;
  wbLoading: boolean;
  wbError: boolean;
  selectedYear: string;
}) {
  const { metrics, country, interestLabel, platform, wbData, wbLoading, wbError, selectedYear } = props;
  const opportunityColors: Record<string, string> = {
    Excellent: TOKENS.success,
    Good: "#14B8A6",
    Moderate: TOKENS.warning,
    Limited: TOKENS.danger,
  };
  const wbUsable = wbData && !wbError;
  const prevYear = String(Number(selectedYear) - 1);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="PLATFORM AUDIENCE"
        value={formatNumber(metrics.platformAudience)}
        sub={metrics.platformAudienceLabel}
        tag={<SourceTag kind="DR" text="DataReportal 2025" />}
      />
      <StatCard
        label="INTERNET USERS"
        value={
          wbLoading ? (
            <span
              className="inline-block h-6 w-24 animate-pulse rounded"
              style={{ background: TOKENS.input }}
            />
          ) : (
            `${metrics.internetPenetration.toFixed(1)}%`
          )
        }
        sub={`${formatNumber(metrics.internetUsers)} of ${formatNumber(metrics.totalPopulation)} total population`}
        tag={
          wbUsable ? (
            <SourceTag kind="WB" text={`WorldBank ${wbData.lastUpdated}`} />
          ) : (
            <SourceTag kind="DR" text="WorldBank unavailable, using DR" />
          )
        }
      />
      <StatCard
        label="EST. ADDRESSABLE AUDIENCE"
        value={<span style={{ color: TOKENS.success }}>~{formatNumber(metrics.addressableAudience)}</span>}
        sub={`${interestLabel} in ${country.name}`}
        tag={<SourceTag kind="AI" text={`DR base × AI ${metrics.interestPercent}%`} />}
        note="AI estimate — not platform data"
      />
      <StatCard
        label="YoY AUDIENCE GROWTH"
        value={
          <span style={{ color: metrics.avgYoyGrowth >= 0 ? TOKENS.success : TOKENS.danger }}>
            {metrics.avgYoyGrowth >= 0 ? "+" : ""}
            {metrics.avgYoyGrowth.toFixed(1)}%
          </span>
        }
        sub={`Social media growth ${selectedYear} vs ${prevYear}`}
        tag={<SourceTag kind="DR" text="DataReportal 2025" />}
      />
      <StatCard
        label="MARKET OPPORTUNITY"
        value={
          <span style={{ color: opportunityColors[metrics.opportunityLabel] }}>
            {metrics.opportunityLabel}
          </span>
        }
        sub={`Score ${metrics.opportunityScore}/100 · ${metrics.opportunityKeyFactor}`}
        tag={<SourceTag kind="CALC" text="DR growth + WB penetration" />}
      />
      <input type="hidden" value={platform} readOnly />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tag,
  note,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  tag: React.ReactNode;
  note?: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <span className="text-[10px] font-semibold tracking-wider" style={{ color: TOKENS.label }}>
        {label}
      </span>
      <div className="text-[22px] font-semibold leading-tight" style={{ color: TOKENS.text }}>
        {value}
      </div>
      <p className="text-[11px]" style={{ color: TOKENS.muted }}>
        {sub}
      </p>
      <div>{tag}</div>
      {note && (
        <span className="text-[10px] italic" style={{ color: TOKENS.label }}>
          {note}
        </span>
      )}
    </div>
  );
}

// ---------- Geo-Intent Map ----------
function GeoIntentMap({
  country,
  interestPercent,
  wbPenetration,
}: {
  country: CountryData;
  interestPercent: number;
  wbPenetration: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Project city lat/lng into the container as relative percent positions.
  const bounds = useMemo(() => {
    const lats = country.topCities.map((c) => c.lat);
    const lngs = country.topCities.map((c) => c.lng);
    const pad = 0.1;
    const minLat = Math.min(...lats) - pad;
    const maxLat = Math.max(...lats) + pad;
    const minLng = Math.min(...lngs) - pad;
    const maxLng = Math.max(...lngs) + pad;
    return { minLat, maxLat, minLng, maxLng };
  }, [country]);

  const project = (lat: number, lng: number) => {
    const rangeLat = bounds.maxLat - bounds.minLat || 1;
    const rangeLng = bounds.maxLng - bounds.minLng || 1;
    const x = ((lng - bounds.minLng) / rangeLng) * 92 + 4; // 4-96%
    const y = ((bounds.maxLat - lat) / rangeLat) * 88 + 6; // 6-94%
    return { x, y };
  };

  const cityRows = useMemo(
    () =>
      country.topCities.map((city) => {
        const effectivePen = Math.min(city.internetPenetrationEstimate, wbPenetration * 1.4);
        const people = Math.round((city.population * effectivePen * interestPercent) / 10000);
        const fbPct = country.platforms.facebook.reachPercent;
        const ttPct = country.platforms.tiktok.reachPercent;
        const engagementScore = Math.round((city.internetPenetrationEstimate + fbPct + ttPct) / 2);
        const score = Math.min(100, engagementScore);
        const growing = country.platforms.tiktok.yoyGrowth > 10 || country.platforms.instagram.yoyGrowth > 10;
        const peak = country.platforms.facebook.peakHours;
        const size = 18 + Math.min(28, Math.log10(Math.max(10, people)) * 6);
        const color = lerpColor(TOKENS.info, TOKENS.success, score / 100);
        return { city, people, fbPct, ttPct, score, growing, peak, size, color };
      }),
    [country, interestPercent, wbPenetration],
  );


  const positioned = cityRows.map((row) => ({ ...row, pos: project(row.city.lat, row.city.lng) }));
  const TOOLTIP_W = 240;
  const TOOLTIP_H = 170;

  return (
    <div
      className="flex flex-col rounded-2xl p-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" style={{ color: TOKENS.muted }} />
          <h2 className="text-[14px] font-semibold" style={{ color: TOKENS.text }}>
            Geo-Intent Distribution
          </h2>
        </div>
        <span
          className="rounded-full px-2 py-[3px] text-[10px] font-semibold"
          style={{ background: "rgba(168,85,247,0.15)", color: TOKENS.purpleLight }}
        >
          ESTIMATED
        </span>
      </div>
      <div
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden rounded-xl"
        style={{
          background: TOKENS.input,
          border: `1px solid ${TOKENS.border}`,
          minHeight: 460,
          backgroundImage: `radial-gradient(circle, ${TOKENS.border} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
        }}
      >
        {/* Bubbles + labels */}
        {positioned.map((row, idx) => (
          <div
            key={row.city.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full transition-transform hover:scale-110"
            style={{
              left: `${row.pos.x}%`,
              top: `${row.pos.y}%`,
              width: row.size,
              height: row.size,
              background: `${row.color}55`,
              border: `2px solid ${row.color}`,
              boxShadow: `0 0 16px ${row.color}66`,
              zIndex: hovered === idx ? 5 : 2,
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium"
              style={{ color: TOKENS.text }}
            >
              {row.city.name} · {row.score}%
            </div>
          </div>
        ))}

        {/* Tooltip overlay — rendered above all bubbles with smart positioning */}
        {hovered !== null && (() => {
          const row = positioned[hovered];
          const w = containerRef.current?.clientWidth ?? 600;
          const h = containerRef.current?.clientHeight ?? 460;
          const px = (row.pos.x / 100) * w;
          const py = (row.pos.y / 100) * h;
          const showAbove = py > TOOLTIP_H + row.size / 2 + 16;
          let left = px - TOOLTIP_W / 2;
          left = Math.max(8, Math.min(w - TOOLTIP_W - 8, left));
          const top = showAbove
            ? py - row.size / 2 - TOOLTIP_H - 12
            : py + row.size / 2 + 12;
          return (
            <div
              className="pointer-events-none absolute z-30 rounded-lg p-3 text-left shadow-2xl"
              style={{
                left,
                top: Math.max(8, Math.min(h - TOOLTIP_H - 8, top)),
                width: TOOLTIP_W,
                background: TOKENS.card,
                border: `1px solid ${TOKENS.border}`,
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold" style={{ color: TOKENS.text }}>
                  {country.flag} {row.city.name}
                </span>
                <span className="text-[11px]" style={{ color: row.color }}>
                  {row.score}%
                </span>
              </div>
              <Row k="Est. Audience" v={`≈ ${formatNumber(row.people)} people`} />
              <Row k="Facebook" v={`${row.fbPct.toFixed(1)}% reach`} />
              <Row k="TikTok" v={`${row.ttPct.toFixed(1)}% reach`} />
              <Row k={row.growing ? "↗ Growing" : "→ Stable"} v="" />
              <Row k="⏱ Peak" v={row.peak} />
              <div className="mt-2 flex flex-wrap gap-1">
                <SourceTag kind="DR" />
                <SourceTag kind="WB" />
                <SourceTag kind="AI" />
              </div>
            </div>
          );
        })()}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: TOKENS.muted }}>
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div
            className="h-1.5 w-32 rounded-full"
            style={{ background: `linear-gradient(to right, ${TOKENS.info}, ${TOKENS.success})` }}
          />
          <span>High</span>
        </div>
        <span>🟡 DR platform % · 🔵 WB population × penetration · 🟣 AI interest estimate</span>
      </div>
    </div>
  );
}


function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5 text-[11px]">
      <span style={{ color: TOKENS.muted }}>{k}</span>
      <span style={{ color: TOKENS.text }}>{v}</span>
    </div>
  );
}

function lerpColor(a: string, b: string, t: number) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ---------- Footer ----------
function TransparencyFooter() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4 text-[11px] leading-relaxed"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}`, color: TOKENS.muted }}
    >
      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: TOKENS.label }} />
      <p>
        Data sources: DataReportal 2025 (annual social media benchmarks, updated January 2025) ·
        WorldBank API (live population and internet penetration, updated quarterly) · Claude AI
        (interest-based audience estimates, clearly labeled as AI-generated approximations).
        Platform reach figures are country-level benchmarks — not individual user targeting data.
        AI estimates are approximations based on public market data. Always verify critical
        business decisions at datareportal.com and worldbank.org
      </p>
    </div>
  );
}

// ---------- AI Predictive Segments ----------
type Segment = {
  name: string;
  badge: "GROWING" | "EMERGING" | "OPPORTUNITY" | "STABLE" | "SEASONAL";
  score: number;
  count: number;
  description: string;
};

const BADGE_STYLES: Record<Segment["badge"], { bg: string; color: string }> = {
  GROWING: { bg: "rgba(52,211,153,0.15)", color: "#6EE7B7" },
  EMERGING: { bg: "rgba(6,182,212,0.15)", color: "#67E8F9" },
  OPPORTUNITY: { bg: "rgba(124,58,237,0.18)", color: "#C4B5FD" },
  STABLE: { bg: "rgba(148,163,184,0.12)", color: "#CBD5E1" },
  SEASONAL: { bg: "rgba(236,72,153,0.15)", color: "#F9A8D4" },
};

function scoreColor(score: number) {
  if (score >= 80) return TOKENS.success;
  if (score >= 60) return TOKENS.warning;
  return TOKENS.danger;
}

function AIPredictiveSegments({
  country,
  interestLabel,
  platform,
  metrics,
}: {
  country: CountryData;
  interestLabel: string;
  platform: PlatformId;
  metrics: ReturnType<typeof calculateMetrics>;
}) {
  const social = country.socialMediaUsers;
  const tt = country.platforms.tiktok;
  const ig = country.platforms.instagram;
  const fb = country.platforms.facebook;
  const li = country.platforms.linkedin;

  const segments: Segment[] = [
    {
      name: "Mobile-first Gen Z",
      badge: "GROWING",
      score: Math.min(95, Math.round(60 + tt.yoyGrowth)),
      count: Math.round(tt.monthlyActiveUsers * 0.55),
      description: `Driven by TikTok +${tt.yoyGrowth.toFixed(1)}% YoY (DR)`,
    },
    {
      name: "Urban Millennials",
      badge: "STABLE",
      score: Math.min(90, Math.round(50 + metrics.internetPenetration * 0.4)),
      count: Math.round(social * 0.32),
      description: `${country.urbanPopulationPercent.toFixed(0)}% urban × DR social base`,
    },
    {
      name: "Reels-native creators",
      badge: "EMERGING",
      score: Math.min(92, Math.round(55 + ig.yoyGrowth * 1.2)),
      count: Math.round(ig.monthlyActiveUsers * 0.28),
      description: `Instagram Reels +${ig.yoyGrowth.toFixed(1)}% YoY (DR)`,
    },
    {
      name: "B2B decision-makers",
      badge: "OPPORTUNITY",
      score: Math.min(88, Math.round(45 + li.yoyGrowth * 2)),
      count: Math.round(li.monthlyActiveUsers * 0.35),
      description: `LinkedIn reach ${li.reachPercent.toFixed(1)}% (DR)`,
    },
    {
      name: "Value-seeking shoppers",
      badge: "SEASONAL",
      score: Math.min(82, Math.round(40 + fb.engagementRate * 8)),
      count: Math.round(fb.monthlyActiveUsers * 0.22),
      description: `FB engagement ${fb.engagementRate}% (DR)`,
    },
  ];

  const platforms: Array<{ name: string; cpm: number }> = [
    { name: "WhatsApp", cpm: country.platforms.whatsapp.cpmUSD },
    { name: "TikTok", cpm: tt.cpmUSD || Infinity },
    { name: "Facebook", cpm: fb.cpmUSD },
    { name: "Instagram", cpm: ig.cpmUSD },
    { name: "YouTube", cpm: country.platforms.youtube.cpmUSD },
  ].filter((p) => p.cpm > 0);
  const cheapest = platforms.sort((a, b) => a.cpm - b.cpm)[0];
  const topSeg = segments.slice().sort((a, b) => b.score - a.score)[0];
  const insight = `Target ${topSeg.name} via ${cheapest.name} for lowest CPM ($${cheapest.cpm.toFixed(2)}) and ${interestLabel} reach in ${country.name}.`;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: TOKENS.text }}>
          AI Predictive Segments
        </h2>
        <SourceTag kind="AI" />
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((s) => {
          const c = scoreColor(s.score);
          const badge = BADGE_STYLES[s.badge];
          return (
            <div
              key={s.name}
              className="rounded-xl p-3"
              style={{ background: TOKENS.input, border: `1px solid ${TOKENS.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                  style={{ background: `${c}22`, border: `2px solid ${c}`, color: c }}
                >
                  {s.score}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium" style={{ color: TOKENS.text }}>
                      {s.name}
                    </span>
                    <span
                      className="rounded-full px-2 py-[2px] text-[9px] font-semibold tracking-wide"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px]" style={{ color: TOKENS.muted }}>
                    {s.description}
                  </p>
                </div>
                <span className="text-[12px] font-semibold" style={{ color: TOKENS.text }}>
                  {formatNumber(s.count)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full" style={{ background: TOKENS.border }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.score}%`, background: c }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="rounded-xl p-3"
        style={{ background: TOKENS.input, borderLeft: `3px solid ${TOKENS.purple}` }}
      >
        <div className="text-[11px] font-semibold" style={{ color: TOKENS.purpleLight }}>
          ✦ AI Insight
        </div>
        <p className="mt-1 text-[12px]" style={{ color: TOKENS.text }}>
          {insight}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <SourceTag kind="AI" />
          <SourceTag kind="DR" text="CPM" />
          <SourceTag kind="WB" text="population base" />
        </div>
      </div>
      <input type="hidden" value={platform} readOnly />
    </div>
  );
}

// ---------- Platform Reach Grid ----------
const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#7C3AED",
  tiktok: "#06B6D4",
  youtube: "#EC4899",
  whatsapp: "#34D399",
  linkedin: "#67E8F9",
  instagram: "#F472B6",
};

function CircularDial({ percent, color }: { percent: number; color: string }) {
  const size = 44;
  const r = 18;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TOKENS.border} strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${filled} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fontWeight="600"
        fill={TOKENS.text}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function PlatformReachGrid({ country, platform }: { country: CountryData; platform: PlatformId }) {
  const items: Array<{ key: PlatformId; name: string }> = [
    { key: "facebook", name: "Facebook" },
    { key: "tiktok", name: "TikTok" },
    { key: "youtube", name: "YouTube" },
    { key: "whatsapp", name: "WhatsApp" },
  ];
  if (platform === "linkedin") items.push({ key: "linkedin", name: "LinkedIn" });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, name }) => {
        const isWhatsApp = key === "whatsapp";
        const data = country.platforms[key as Exclude<PlatformId, "all">];
        const reachPercent = isWhatsApp
          ? country.platforms.whatsapp.penetrationPercent
          : (data as { reachPercent: number }).reachPercent;
        const adReach = isWhatsApp
          ? country.platforms.whatsapp.monthlyActiveUsers
          : (data as { adReach: number }).adReach;
        const color = PLATFORM_COLORS[key] ?? TOKENS.purple;
        const active = platform === key;
        const yoy = (data as { yoyGrowth: number }).yoyGrowth;

        return (
          <div
            key={key}
            className="rounded-2xl p-4"
            style={{
              background: TOKENS.card,
              border: `1px solid ${active ? TOKENS.purple : TOKENS.border}`,
              boxShadow: active ? `0 0 0 1px ${TOKENS.purple}` : undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
                {name}
              </span>
              <CircularDial percent={reachPercent} color={color} />
            </div>
            <div className="mt-3 space-y-1.5 text-[11px]">
              <Row k="Ad Reach" v={formatNumber(adReach)} />
              <Row k="CPM" v={`$${data.cpmUSD.toFixed(2)}`} />
              <Row k="Best Format" v={data.bestFormat} />
              <Row k="Peak Hours" v={data.peakHours} />
              {!isWhatsApp && (
                <>
                  <Row k="Top Age" v={(data as { topAgeGroup: string }).topAgeGroup} />
                  <Row
                    k="Gender"
                    v={`${(data as { genderMale: number }).genderMale}% M / ${(data as { genderFemale: number }).genderFemale}% F`}
                  />
                </>
              )}
              {isWhatsApp && (
                <>
                  <Row k="Open Rate" v={`${country.platforms.whatsapp.openRate}%`} />
                  <Row k="CTR" v={`${country.platforms.whatsapp.ctr}%`} />
                </>
              )}
              <div className="flex justify-between gap-2 py-0.5">
                <span style={{ color: TOKENS.muted }}>YoY Growth</span>
                <span style={{ color: yoy >= 0 ? TOKENS.success : TOKENS.danger }}>
                  {yoy >= 0 ? "+" : ""}
                  {yoy.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-3">
              <SourceTag kind="DR" text="DataReportal 2025" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Internet Penetration Chart ----------
function InternetPenetrationChart({
  country,
  wbPenetration,
}: {
  country: CountryData;
  wbPenetration: number;
}) {
  const ceiling = Math.max(wbPenetration, 1);
  const cities = country.topCities.slice(0, 7).map((c) => ({
    name: c.name,
    pct: Math.min(c.internetPenetrationEstimate, ceiling * 1.4),
  }));
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          Internet Penetration by City
        </h3>
        <div className="flex gap-1">
          <SourceTag kind="WB" />
          <SourceTag kind="AI" />
        </div>
      </div>
      <div className="space-y-2">
        {cities.map((c) => (
          <div key={c.name} className="flex items-center gap-2">
            <span className="w-24 truncate text-[11px]" style={{ color: TOKENS.muted }}>
              {c.name}
            </span>
            <div className="relative h-2 flex-1 rounded-full" style={{ background: TOKENS.border }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${c.pct}%`, background: TOKENS.purple }}
              />
            </div>
            <span className="w-10 text-right text-[11px] font-medium" style={{ color: TOKENS.text }}>
              {c.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px]" style={{ color: TOKENS.label }}>
        🔵 WB national penetration × 🟣 AI city distribution
      </p>
    </div>
  );
}

// ---------- Demographics Panel ----------
function DemographicsPanel({ country, platform }: { country: CountryData; platform: PlatformId }) {
  const ref =
    platform === "all" || platform === "whatsapp"
      ? country.platforms.facebook
      : (country.platforms[platform as Exclude<PlatformId, "all" | "whatsapp">] as import("@/data/audienceIntelligenceData").PlatformData);

  // Derive an age distribution from topAgeGroup (DR-aligned heuristic).
  const ageBuckets = useMemo(() => {
    const top = ref.topAgeGroup;
    const weights: Record<string, number[]> = {
      // [16-24, 25-34, 35-44, 45+]
      "16–24": [50, 28, 14, 8],
      "18–34": [28, 38, 22, 12],
      "18–44": [22, 30, 28, 20],
      "25–44": [14, 36, 32, 18],
    };
    return weights[top] ?? [25, 30, 25, 20];
  }, [ref.topAgeGroup]);

  const male = ref.genderMale || 50;
  const female = ref.genderFemale || 50;
  const urban = country.urbanPopulationPercent;
  const rural = 100 - urban;

  const bars: Array<{ label: string; value: number; color: string }> = [
    { label: "Age 16–24", value: ageBuckets[0], color: TOKENS.purple },
    { label: "Age 25–34", value: ageBuckets[1], color: TOKENS.purple },
    { label: "Age 35–44", value: ageBuckets[2], color: TOKENS.purple },
    { label: "Age 45+", value: ageBuckets[3], color: TOKENS.purple },
    { label: "Male", value: male, color: TOKENS.info },
    { label: "Female", value: female, color: "#EC4899" },
    { label: "Urban", value: urban, color: TOKENS.success },
    { label: "Rural", value: rural, color: TOKENS.warning },
  ];

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          Audience Demographics
        </h3>
        <SourceTag kind="DR" />
      </div>
      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-20 text-[11px]" style={{ color: TOKENS.muted }}>
              {b.label}
            </span>
            <div className="relative h-2 flex-1 rounded-full" style={{ background: TOKENS.border }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, b.value)}%`, background: b.color }}
              />
            </div>
            <span className="w-10 text-right text-[11px] font-medium" style={{ color: TOKENS.text }}>
              {b.value.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px]" style={{ color: TOKENS.label }}>
        🟡 DR platform demographics · 🔵 WB urban/rural split
      </p>
    </div>
  );
}

// ---------- Conversion Matrix ----------
function ConversionMatrix({ country, interestId }: { country: CountryData; interestId: string }) {
  const interest = getInterest(interestId);
  const cols: Array<{ name: string; engagement: number }> = [
    { name: "Meta", engagement: country.platforms.facebook.engagementRate },
    { name: "TikTok", engagement: country.platforms.tiktok.engagementRate },
    { name: "WhatsApp", engagement: country.platforms.whatsapp.ctr },
  ];
  const rows: Array<{ name: string; multiplier: number }> = [
    { name: "High", multiplier: 11 },
    { name: "Mid", multiplier: 7.5 },
    { name: "Emerging", multiplier: 4.5 },
  ];

  const interestBoost = Math.max(0.7, Math.min(1.4, interest.basePercent / 10));

  const cell = (r: number, c: number) => {
    const base = cols[c].engagement * rows[r].multiplier * interestBoost;
    return Math.max(5, Math.min(95, Math.round(base)));
  };

  const colorFor = (v: number) => {
    if (v >= 70) return TOKENS.success;
    if (v >= 50) return TOKENS.warning;
    return TOKENS.danger;
  };

  let best = { r: 0, c: 0, v: 0 };
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < cols.length; c += 1) {
      const v = cell(r, c);
      if (v > best.v) best = { r, c, v };
    }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          Platform Conversion Matrix
        </h3>
        <SourceTag kind="AI" />
      </div>
      <div className="grid grid-cols-4 gap-1 text-[11px]">
        <div />
        {cols.map((c) => (
          <div key={c.name} className="text-center font-medium" style={{ color: TOKENS.muted }}>
            {c.name}
          </div>
        ))}
        {rows.map((r, ri) => (
          <FragmentRow
            key={r.name}
            rowName={r.name}
            cells={cols.map((_, ci) => ({ value: cell(ri, ci), color: colorFor(cell(ri, ci)) }))}
          />
        ))}
      </div>
      <div
        className="mt-3 rounded-md px-2 py-1.5 text-[11px] font-medium"
        style={{ background: `${TOKENS.success}22`, color: TOKENS.success }}
      >
        Best: {rows[best.r].name} × {cols[best.c].name} ({best.v}%)
      </div>
      <p className="mt-2 text-[10px]" style={{ color: TOKENS.label }}>
        🟣 AI estimated · 🟡 DR CPM + reach base
      </p>
    </div>
  );
}

function FragmentRow({
  rowName,
  cells,
}: {
  rowName: string;
  cells: Array<{ value: number; color: string }>;
}) {
  return (
    <>
      <div className="flex items-center text-[11px] font-medium" style={{ color: TOKENS.muted }}>
        {rowName}
      </div>
      {cells.map((c, i) => (
        <div
          key={i}
          className="rounded-md py-2 text-center text-[12px] font-semibold"
          style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}
        >
          {c.value}%
        </div>
      ))}
    </>
  );
}
