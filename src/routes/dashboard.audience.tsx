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

// ---------- Design tokens (scoped to this page) ----------
const TOKENS = {
  bg: "#0F0F1A",
  card: "#1A1A2E",
  input: "#12122A",
  border: "#2D2D4E",
  purple: "#7C3AED",
  purpleLight: "#A855F7",
  text: "#E2E8F0",
  muted: "#94A3B8",
  label: "#64748B",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

type SourceKind = "DR" | "WB" | "AI" | "CALC";
const SOURCE_META: Record<SourceKind, { color: string; bg: string; full: string }> = {
  DR: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", full: "DataReportal 2025 · Annual benchmark" },
  WB: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)", full: "WorldBank API · Quarterly updated" },
  AI: { color: "#A855F7", bg: "rgba(168,85,247,0.12)", full: "Claude AI estimate · Generated per query" },
  CALC: { color: "#22C55E", bg: "rgba(34,197,94,0.12)", full: "Calculated from DR + WB combined" },
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
  const [selectedInterest, setSelectedInterest] = useState("business");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("all");
  const [selectedYear, setSelectedYear] = useState<"2025" | "2024" | "2023">("2025");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [wbData, setWbData] = useState<WorldBankData | null>(null);
  const [wbLoading, setWbLoading] = useState(false);
  const [wbError, setWbError] = useState(false);

  const country: CountryData = audienceData[selectedCountry] ?? audienceData.BD;
  const interest = getInterest(selectedInterest);

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
    () => calculateMetrics(country, selectedPlatform, selectedInterest, wbError ? null : wbData),
    [country, selectedPlatform, selectedInterest, wbData, wbError],
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
        selectedInterest={selectedInterest}
        onInterestChange={(id) => {
          setSelectedInterest(id);
          setSearchQuery("");
          setShowDropdown(false);
        }}
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

      <GeoIntentMap
        country={country}
        interestPercent={metrics.interestPercent}
        wbPenetration={metrics.internetPenetration}
      />

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
          className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: TOKENS.purple }}
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
    const range = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLng - bounds.minLng);
    const cx = (bounds.minLng + bounds.maxLng) / 2;
    const cy = (bounds.minLat + bounds.maxLat) / 2;
    const x = ((lng - cx) / range) * 80 + 50; // 10-90%
    const y = ((cy - lat) / range) * 80 + 50;
    return { x: Math.max(8, Math.min(92, x)), y: Math.max(10, Math.min(90, y)) };
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
        const size = 24 + Math.min(40, Math.log10(Math.max(10, people)) * 10);
        const color = lerpColor(TOKENS.info, TOKENS.success, score / 100);
        return { city, people, fbPct, ttPct, score, growing, peak, size, color };
      }),
    [country, interestPercent, wbPenetration],
  );

  return (
    <div
      className="rounded-2xl p-4"
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
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          background: TOKENS.input,
          border: `1px solid ${TOKENS.border}`,
          height: 280,
          backgroundImage: `radial-gradient(circle, ${TOKENS.border} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      >
        {cityRows.map((row, idx) => {
          const pos = project(row.city.lat, row.city.lng);
          return (
            <div
              key={row.city.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full transition-transform hover:scale-110"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: row.size,
                height: row.size,
                background: `${row.color}55`,
                border: `2px solid ${row.color}`,
                boxShadow: `0 0 16px ${row.color}66`,
              }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium"
                style={{ color: TOKENS.text }}
              >
                {row.city.name} · {row.score}%
              </div>

              {hovered === idx && (
                <div
                  className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-lg p-3 text-left shadow-2xl"
                  style={{
                    bottom: "calc(100% + 12px)",
                    width: 240,
                    background: TOKENS.card,
                    border: `1px solid ${TOKENS.border}`,
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
              )}
            </div>
          );
        })}
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
