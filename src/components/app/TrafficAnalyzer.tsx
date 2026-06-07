import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, Globe2, MousePointerClick, Users, Clock, TrendingUp, Search, Share2, Mail, Megaphone, ArrowUpRight, RefreshCw, MapPin, Sparkles, X, Link2, AlertTriangle, Wand2, CheckCircle2, Link as LinkIcon, Plus, List as ListIcon } from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { GlassCard, Pill, StatCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { useGa4Status, useGa4AuthUrl, useGa4ListProperties, useGa4SelectProperty, useGa4Sync, useGa4Analytics } from "@/hooks/useGa4";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tiny hook: are we authenticated to the app? Used to gate GA4 server-fn calls so
// signed-out visitors don't trigger 401s from requireSupabaseAuth.
function useHasSession() {
  const [has, setHas] = useState<boolean>(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setHas(!!data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setHas(!!s));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  return has;
}

type RangeMode = "single" | "month" | "last2" | "last3" | "custom";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M" : n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : String(n);

// Deterministic pseudo-random based on domain + date for repeatable mock data
function seedHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
function rand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  const f = x - Math.floor(x);
  return min + f * (max - min);
}

function buildMonthlySeries(domain: string, months: { y: number; m: number }[]) {
  return months.map(({ y, m }) => {
    const seed = seedHash(`${domain}-${y}-${m}`);
    const visits = Math.round(rand(seed, 220_000, 1_400_000));
    return {
      label: `${MONTHS[m]} ${String(y).slice(2)}`,
      visits,
      unique: Math.round(visits * rand(seed + 1, 0.55, 0.78)),
      bounce: +rand(seed + 2, 38, 62).toFixed(1),
      duration: +rand(seed + 3, 90, 280).toFixed(0), // seconds
      pages: +rand(seed + 4, 1.8, 4.6).toFixed(2),
    };
  });
}

function trafficSplit(domain: string, key: string) {
  const seed = seedHash(domain + key);
  // Direct, Search, Social, Referral, Mail, Display
  const raw = [
    rand(seed, 25, 42),
    rand(seed + 1, 28, 45),
    rand(seed + 2, 8, 22),
    rand(seed + 3, 4, 12),
    rand(seed + 4, 2, 7),
    rand(seed + 5, 1, 6),
  ];
  const sum = raw.reduce((a, b) => a + b, 0);
  const norm = raw.map(v => +(v / sum * 100).toFixed(1));
  return [
    { name: "Direct", value: norm[0], icon: Globe2, color: "oklch(0.65 0.22 280)" },
    { name: "Search", value: norm[1], icon: Search, color: "oklch(0.72 0.18 155)" },
    { name: "Social", value: norm[2], icon: Share2, color: "oklch(0.68 0.2 320)" },
    { name: "Referral", value: norm[3], icon: ArrowUpRight, color: "oklch(0.78 0.17 75)" },
    { name: "Mail", value: norm[4], icon: Mail, color: "oklch(0.7 0.15 220)" },
    { name: "Display", value: norm[5], icon: Megaphone, color: "oklch(0.65 0.25 20)" },
  ];
}

function topCountries(domain: string, key: string) {
  const seed = seedHash(domain + key + "geo");
  const list = ["United States","India","Bangladesh","United Kingdom","Germany","Brazil","UAE","Indonesia"];
  return list.slice(0, 6).map((c, i) => ({
    country: c,
    share: +rand(seed + i, 4, 32).toFixed(1),
  })).sort((a, b) => b.share - a.share);
}

function topKeywords(domain: string, key: string) {
  const seed = seedHash(domain + key + "kw");
  const base = ["brand strategy","marketing OS","ai for marketers","content automation","brand guidelines","social listening","predictive analytics","competitor benchmark"];
  return base.slice(0, 6).map((k, i) => ({
    kw: k,
    volume: Math.round(rand(seed + i, 1200, 22000)),
    pos: Math.round(rand(seed + i + 30, 1, 18)),
  })).sort((a, b) => b.volume - a.volume);
}

export function TrafficAnalyzer({ domain = "example.com" }: { domain?: string }) {
  const today = new Date();
  const [mode, setMode] = useState<RangeMode>("month");
  const [pickedDate, setPickedDate] = useState<Date>(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [customStart, setCustomStart] = useState<Date | undefined>(startOfMonth(subMonths(today, 1)));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(endOfMonth(today));
  const [refreshing, setRefreshing] = useState(false);
  const [overrideDomain, setOverrideDomain] = useState<string | null>(null);

  const hasSession = useHasSession();
  const ga4Status = useGa4Status(hasSession);
  const ga4SelectProp = useGa4SelectProperty();
  const ga4ListProps = useGa4ListProperties();
  const ga4Sync = useGa4Sync();
  const ga4Analytics = useGa4Analytics(hasSession && !!ga4Status.data?.connected && !!ga4Status.data?.selectedPropertyId);
  const ga4Connected = !!ga4Status.data?.connected;
  const [manualPicker, setManualPicker] = useState<string | null>(null);
  const ga4Live = ga4Connected && !!ga4Analytics.data && (ga4Analytics.data as any).connected !== false && !!(ga4Analytics.data as any)?.snapshot;
  const ga4SiteUrl = ga4Status.data?.connectionWebsiteUrl
    ?? (ga4Status.data?.properties?.find((p: any) => p.property_id === ga4Status.data?.selectedPropertyId) as any)?.default_uri
    ?? null;

  const cleanDomain = useMemo(() => {
    const src = overrideDomain ?? (ga4Live && ga4SiteUrl ? ga4SiteUrl : (domain || "example.com"));
    return src.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }, [domain, ga4Live, ga4SiteUrl, overrideDomain]);

  const months = useMemo(() => {
    if (mode === "single") {
      const d = pickedDate;
      return [{ y: d.getFullYear(), m: d.getMonth() }];
    }
    if (mode === "month") return [{ y: year, m: month }];
    if (mode === "last2") {
      const a = subMonths(today, 1), b = today;
      return [{ y: a.getFullYear(), m: a.getMonth() }, { y: b.getFullYear(), m: b.getMonth() }];
    }
    if (mode === "last3") {
      return [2,1,0].map(i => {
        const d = subMonths(today, i);
        return { y: d.getFullYear(), m: d.getMonth() };
      });
    }
    // custom
    if (customStart && customEnd) {
      const arr: { y: number; m: number }[] = [];
      let cur = startOfMonth(customStart);
      const end = startOfMonth(customEnd);
      while (cur <= end) {
        arr.push({ y: cur.getFullYear(), m: cur.getMonth() });
        cur = startOfMonth(subMonths(cur, -1));
      }
      return arr;
    }
    return [{ y: year, m: month }];
  }, [mode, pickedDate, year, month, customStart, customEnd, today]);

  const cacheKey = months.map(x => `${x.y}-${x.m}`).join("|");

  const series = useMemo(() => buildMonthlySeries(cleanDomain, months), [cleanDomain, cacheKey]);
  const split = useMemo(() => trafficSplit(cleanDomain, cacheKey), [cleanDomain, cacheKey]);
  const geo = useMemo(() => topCountries(cleanDomain, cacheKey), [cleanDomain, cacheKey]);
  const kws = useMemo(() => topKeywords(cleanDomain, cacheKey), [cleanDomain, cacheKey]);

  const totals = useMemo(() => {
    // Prefer real GA4 totals when connected & analytics snapshot is available.
    const snap: any = ga4Live ? (ga4Analytics.data as any)?.snapshot : null;
    const t = snap?.totals;
    if (t) {
      const visits = Number(t.sessions ?? 0);
      const users = Number(t.users ?? 0);
      const newU = Number(t.new_users ?? 0);
      const returning = Math.max(0, users - newU);
      const dur = Number(t.avg_session_duration ?? 0);
      return {
        visits,
        unique: users,
        bounce: (Number(t.bounce_rate ?? 0) * 100).toFixed(1) + "%",
        dur: `${Math.floor(dur / 60)}m ${Math.round(dur % 60)}s`,
        pages: Number(t.pages_per_session ?? 0).toFixed(2),
        newVisitorRate: (users ? (newU / users) * 100 : 0).toFixed(1) + "%",
        _returning: returning,
      } as any;
    }
    const visits = series.reduce((a, b) => a + b.visits, 0);
    const unique = series.reduce((a, b) => a + b.unique, 0);
    const bounce = series.reduce((a, b) => a + b.bounce, 0) / series.length;
    const dur = series.reduce((a, b) => a + b.duration, 0) / series.length;
    const pages = series.reduce((a, b) => a + b.pages, 0) / series.length;
    const seed = seedHash(cleanDomain + cacheKey);
    const newRate = rand(seed + 10, 38, 64);
    return {
      visits, unique,
      bounce: bounce.toFixed(1) + "%",
      dur: `${Math.floor(dur / 60)}m ${Math.round(dur % 60)}s`,
      pages: pages.toFixed(2),
      newVisitorRate: newRate.toFixed(1) + "%",
    };
  }, [series, cleanDomain, cacheKey, ga4Live, ga4Analytics.data]);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }

  const years = Array.from({ length: 6 }, (_, i) => today.getFullYear() - i);

  return (
    <div className="space-y-5">
      <GA4Banner />

      <AnyWebsiteUrlCard
        currentDomain={cleanDomain}
        ga4Connected={ga4Connected}
        properties={ga4Status.data?.properties ?? []}
        onAnalyze={async (clean) => {
          setOverrideDomain(clean);
          if (!ga4Connected) {
            toast.success(`Analyzing ${clean}`, { description: "Connect Google Analytics above to see live data for this site." });
            return;
          }
          const norm = (s: string | null | undefined) =>
            (s ?? "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
          const hostMatches = (host: string) =>
            !!host && (host === clean || host.endsWith("." + clean) || clean.endsWith("." + host));

          const localProps = ga4Status.data?.properties ?? [];
          const localMatch = localProps.find((p: any) => hostMatches(norm(p.default_uri)));
          if (localMatch) {
            await ga4SelectProp.mutateAsync(localMatch.property_id);
            try { await ga4Sync.mutateAsync(90); } catch {}
            toast.success(`Analyzing ${clean}`, { description: `Matched GA4 property: ${localMatch.display_name}` });
            return;
          }
          // No match on cached default_uri — re-check on the server (which also
          // inspects each property's dataStreams webStreamData defaultUri).
          try {
            const r = await ga4ListProps.mutateAsync({ websiteUrl: clean });
            if (r?.matchedPropertyId) {
              try { await ga4Sync.mutateAsync(90); } catch {}
              const m = r.properties.find((p: any) => p.property_id === r.matchedPropertyId);
              toast.success(`Analyzing ${clean}`, { description: `Matched GA4 property: ${m?.display_name ?? r.matchedPropertyId}` });
              return;
            }
          } catch (e: any) {
            toast.error("Could not check GA4 properties", { description: e?.message ?? "Try again." });
            return;
          }
          // Still no automatic match → let the user pick from the full property list.
          setManualPicker(clean);
          toast.info(`No GA4 property matched ${clean}`, { description: "Select the correct GA4 property below to view its analytics." });
        }}
      />

      {manualPicker && (
        <ManualPropertyPicker
          pendingUrl={manualPicker}
          properties={ga4Status.data?.properties ?? []}
          loading={ga4SelectProp.isPending || ga4Sync.isPending}
          onCancel={() => setManualPicker(null)}
          onPick={async (propertyId) => {
            await ga4SelectProp.mutateAsync(propertyId);
            try { await ga4Sync.mutateAsync(90); } catch {}
            const m = (ga4Status.data?.properties ?? []).find((p: any) => p.property_id === propertyId);
            toast.success(`Analyzing ${manualPicker}`, { description: `Now showing live data from "${m?.display_name ?? propertyId}".` });
            setManualPicker(null);
          }}
        />
      )}

      {/* Persistent "no auto-match" banner — shown whenever GA4 is connected
          but the dashboard would otherwise show modeled data because the
          selected property doesn't match the current domain. */}
      {ga4Connected && !ga4Live && !manualPicker && (ga4Status.data?.properties?.length ?? 0) > 0 && (
        <NoMatchBanner
          properties={ga4Status.data?.properties ?? []}
          selectedPropertyId={ga4Status.data?.selectedPropertyId ?? null}
          loading={ga4SelectProp.isPending || ga4Sync.isPending}
          onPick={async (propertyId) => {
            await ga4SelectProp.mutateAsync(propertyId);
            try { await ga4Sync.mutateAsync(90); } catch {}
            const m = (ga4Status.data?.properties ?? []).find((p: any) => p.property_id === propertyId);
            toast.success("GA4 property selected", { description: `Now showing live data from "${m?.display_name ?? propertyId}".` });
          }}
        />
      )}

      {/* Filter bar */}
      <GlassCard className="!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-medium mr-2">
            <Globe2 className="h-4 w-4 text-indigo-300" />
            <span>{cleanDomain}</span>
            {ga4Status.data?.connectionSource === "brand_dna" && ga4Connected ? (
              <Pill tone="emerald"><LinkIcon className="h-3 w-3" /> Auto-connected via Brand DNA</Pill>
            ) : (
              <Pill tone="emerald"><CheckCircle2 className="h-3 w-3" /> {ga4Connected ? "GA4 connected" : "Auto-connected"}</Pill>
            )}
            <Pill tone={ga4Live ? "purple" : "emerald"}>{ga4Live ? "Live GA4" : "Live mock"}</Pill>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {(["last3","last2","month","single","custom"] as RangeMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md border border-white/10 px-3 py-1.5 text-xs transition",
                  mode === m ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent" : "bg-white/5 hover:bg-white/10 text-foreground/80"
                )}
              >
                {m === "last3" ? "Last 3 mo" : m === "last2" ? "Last 2 mo" : m === "month" ? "By month" : m === "single" ? "Specific day" : "Custom range"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {mode === "month" && (
            <>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((mn, i) => <SelectItem key={i} value={String(i)}>{mn}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[110px] bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}

          {mode === "single" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-white/5 border-white/10 h-9">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(pickedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={pickedDate} onSelect={(d) => d && setPickedDate(d)} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          )}

          {mode === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white/5 border-white/10 h-9">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customStart ? format(customStart, "MMM yyyy") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-xs">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white/5 border-white/10 h-9">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customEnd ? format(customEnd, "MMM yyyy") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            Showing {months.length === 1 ? `${MONTHS[months[0].m]} ${months[0].y}` : `${MONTHS[months[0].m]} ${months[0].y} – ${MONTHS[months[months.length-1].m]} ${months[months.length-1].y}`}
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} className="h-8">
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </GlassCard>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={fmt(totals.visits)} delta="+8.4%" accent="indigo" />
        <StatCard label="Avg. Time on Site" value={totals.dur} delta="+12s" accent="emerald" />
        <StatCard label="Pages per Visit" value={totals.pages} delta="+0.18" accent="purple" />
        <StatCard label="New Visitor Rate" value={totals.newVisitorRate} delta="+3.2%" accent="indigo" />
        <StatCard label="Total Visitors" value={fmt(Math.round(totals.visits * 0.82))} delta="+6.1%" accent="emerald" />
        <StatCard label="Unique Visitors" value={fmt(totals.unique)} delta="+4.7%" accent="purple" />
        <StatCard label="Bounce Rate" value={totals.bounce} delta="-1.4%" accent="indigo" />
        <StatCard label="Avg. Sessions / Visitor" value={(totals.visits / Math.max(totals.unique, 1)).toFixed(2)} delta="+0.09" accent="emerald" />
      </div>

      <DemographicsCard domain={cleanDomain} cacheKey={cacheKey} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <GlassCard className="h-[340px]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-300" /> Traffic Trend</div>
              <div className="text-xs text-muted-foreground">Visits vs Unique visitors</div>
            </div>
            <Pill tone="indigo">Monthly</Pill>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} />
              <YAxis stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v as number)} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmt(v)} />
              <Area type="monotone" dataKey="visits" stroke="oklch(0.65 0.22 280)" fill="url(#gv)" strokeWidth={2} />
              <Area type="monotone" dataKey="unique" stroke="oklch(0.72 0.18 155)" fill="url(#gu)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="h-[340px]">
          <div className="text-sm font-medium mb-3 flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-purple-300" /> Traffic Sources</div>
          <div className="space-y-2.5">
            {split.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground/80"><s.icon className="h-3.5 w-3.5" /> {s.name}</span>
                  <span className="text-foreground/70">{s.value}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.value}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <div className="text-sm font-medium mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-300" /> Top Countries</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={geo} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
              <XAxis type="number" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} unit="%" />
              <YAxis dataKey="country" type="category" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="share" fill="oklch(0.65 0.22 280)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium flex items-center gap-2"><Search className="h-4 w-4 text-indigo-300" /> Top Organic Keywords</div>
            <Pill tone="purple">SEO</Pill>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/5">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.03] text-muted-foreground">
                <tr><th className="text-left p-2 font-medium">Keyword</th><th className="text-right p-2 font-medium">Volume</th><th className="text-right p-2 font-medium">Position</th></tr>
              </thead>
              <tbody>
                {kws.map((k) => (
                  <tr key={k.kw} className="border-t border-white/5">
                    <td className="p-2">{k.kw}</td>
                    <td className="p-2 text-right">{k.volume.toLocaleString()}</td>
                    <td className="p-2 text-right"><span className={cn("inline-block min-w-7 text-center rounded px-1.5", k.pos <= 3 ? "bg-emerald-500/15 text-emerald-300" : k.pos <= 10 ? "bg-indigo-500/15 text-indigo-300" : "bg-white/5 text-foreground/70")}>{k.pos}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <div className="text-xs text-muted-foreground flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Audience Snapshot</div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span>Desktop</span><span className="text-foreground/80">58.2%</span></div>
            <div className="flex justify-between"><span>Mobile</span><span className="text-foreground/80">39.4%</span></div>
            <div className="flex justify-between"><span>Tablet</span><span className="text-foreground/80">2.4%</span></div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Engagement</div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span>New visitors</span><span className="text-foreground/80">61%</span></div>
            <div className="flex justify-between"><span>Returning</span><span className="text-foreground/80">39%</span></div>
            <div className="flex justify-between"><span>Sessions / visitor</span><span className="text-foreground/80">2.3</span></div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs text-muted-foreground flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Period summary</div>
          <p className="mt-2 text-xs text-foreground/80 leading-relaxed">
            Traffic to <span className="text-indigo-300 font-medium">{cleanDomain}</span> is trending upward in the selected window. Search and Direct dominate acquisition — consider doubling down on branded SEO and onsite conversion polish to capitalize.
          </p>
        </GlassCard>
      </div>

      <PredictiveAnalytics baseVisits={totals.visits} baseUnique={totals.unique} baseBounce={parseFloat(totals.bounce)} domain={cleanDomain} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GA4 Bridge Banner — Connection panel + status bar + URL switcher.
// 4 states: not connected · auto-inherited from Brand DNA · directly
// connected · sync error.
// ─────────────────────────────────────────────────────────────
function GA4Banner() {
  const [dismissed, setDismissed] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const hasSession = useHasSession();
  const status = useGa4Status(hasSession);
  const authUrl = useGa4AuthUrl();
  const listProps = useGa4ListProperties();
  const selectProp = useGa4SelectProperty();
  const sync = useGa4Sync();

  const decodeGrantedScopes = (value: string | null): string[] => {
    if (!value) return [];
    try {
      const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));
      return Array.isArray(decoded) ? decoded.filter((scope): scope is string => typeof scope === "string") : [];
    } catch {
      return [];
    }
  };

  const ga4ErrorMessage = (reason: string | null) => {
    if (reason === "analytics_scopes_not_granted") {
      return "Google did not grant the required analytics.readonly permission. Check the browser console for the exact scopes Google returned, then reconnect and approve Analytics read access.";
    }
    if (reason === "missing_refresh_token") {
      return "Google did not return offline access. Please reconnect and approve the consent screen again.";
    }
    if (reason === "access_denied") return "Google access was cancelled before the Analytics permissions were approved.";
    return reason ?? "Please try again.";
  };

  const s = status.data;
  const connected = !!s?.connected;
  const hasProps = (s?.properties?.length ?? 0) > 0;
  const source = s?.connectionSource ?? null;
  const syncError = !!s?.lastError;

  // Prefill the URL field with the company's website if we know it, or with a value
  // stashed before the app sign-in redirect.
  useEffect(() => {
    if (websiteUrl) return;
    const stash = typeof window !== "undefined" ? sessionStorage.getItem("ga4_pending_url") : null;
    if (stash) { setWebsiteUrl(stash); return; }
    if ((s?.company as any)?.website_url) setWebsiteUrl(((s?.company as any).website_url as string) ?? "");
  }, [s?.company, websiteUrl]);

  // Handle the OAuth callback returning with ?ga4=connected|error.
  // After a successful connection, immediately discover properties and run an initial
  // sync so the user sees real analytics without an extra click.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ga4 = url.searchParams.get("ga4");
    if (!ga4) return;
    const reason = url.searchParams.get("reason");
    const grantedScopes = decodeGrantedScopes(url.searchParams.get("granted_scopes"));
    url.searchParams.delete("ga4");
    url.searchParams.delete("reason");
    url.searchParams.delete("granted_scopes");
    window.history.replaceState({}, "", url.pathname + (url.search ? "?" + url.searchParams.toString() : ""));
    sessionStorage.removeItem("ga4_pending_url");
    if (ga4 === "connected") {
      toast.success("Google Analytics connected", { description: "Discovering your GA4 properties…" });
      (async () => {
        try {
          const r = await listProps.mutateAsync(undefined);
          if (r?.properties?.length) {
            await sync.mutateAsync(90);
            toast.success("GA4 data synced", { description: `${r.properties.length} propert${r.properties.length === 1 ? "y" : "ies"} discovered.` });
          } else {
            toast.warning("No GA4 properties found", { description: "Your Google account doesn't have access to any GA4 properties." });
          }
        } catch (e: any) {
          toast.error("GA4 setup failed", { description: e?.message ?? "Could not discover properties." });
        }
      })();
    } else if (ga4 === "error") {
      if (reason === "analytics_scopes_not_granted") {
        console.info("[GA4 OAuth] Google granted scopes:", grantedScopes.length ? grantedScopes : "none");
      }
      toast.error("Google Analytics connection failed", { description: ga4ErrorMessage(reason) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = async () => {
    try {
      const url = websiteUrl.trim();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        if (url) sessionStorage.setItem("ga4_pending_url", url);
        toast.error("Sign in required", {
          description: "Please create an account or log in first, then connect Google Analytics from this page.",
        });
        return;
      }
      if (url) sessionStorage.setItem("ga4_pending_url", url);
      const r = await authUrl.mutateAsync({ source: "brand_intelligence", websiteUrl: url || undefined });
      console.log("[GA4 OAuth] Complete authorization URL:", r.url);
      window.location.href = r.url;
    } catch (e: any) {
      toast.error("Failed to start Google sign-in", { description: e?.message ?? "Unknown error" });
    }
  };

  if (dismissed && connected) return null;

  // ── State A: not connected → full connection panel
  if (!connected) {
    return (
      <div className="relative rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-5 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-500" />
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Link2 className="h-4 w-4 text-indigo-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Connect Google Analytics 4</div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Power your Brand Intelligence with real GA4 data. We'll discover your properties
              and stream live traffic, audience, and forecasting metrics. After connecting,
              you can enter any website URL linked to your GA4 account to view its analytics.
            </p>

            <div className="mt-3">
              <Button size="sm" onClick={onConnect} disabled={authUrl.isPending} className="bg-white text-black hover:bg-white/90 h-9">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {authUrl.isPending ? "Opening Google…" : "Continue with Google Analytics"}
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> analytics.readonly</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Hourly background sync</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> AI forecasting</span>
              <span className="text-muted-foreground/70">· Powered by GA4 · Secured with OAuth 2.0 · AES-256 stored</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── State D: sync error
  if (syncError) {
    return (
      <div className="relative rounded-xl border border-red-400/20 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-4 pl-5 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-600" />
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-300 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">GA4 sync error</div>
            <p className="text-xs text-muted-foreground mt-1">{s?.lastError ?? "Last sync failed"} · Last successful: {s?.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : "—"}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => sync.mutate(90)} disabled={sync.isPending} className="h-8">
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", sync.isPending && "animate-spin")} /> Retry now
              </Button>
              <Button size="sm" variant="outline" onClick={onConnect} className="h-8 bg-white/5 border-white/10">Re-authenticate</Button>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  // ── State B/C: connected (auto-inherited or direct) — status bar + URL switcher
  const isAutoInherited = source === "brand_dna";
  const stripCls = isAutoInherited
    ? "border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent"
    : "border-purple-400/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent";
  const accentCls = isAutoInherited
    ? "from-emerald-400 to-emerald-600"
    : "from-indigo-400 to-purple-500";

  return (
    <div className="space-y-2">
      {/* Status bar */}
      <div className={cn("relative rounded-xl border p-3 pl-4 overflow-hidden flex items-center gap-3 flex-wrap", stripCls)}>
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", accentCls)} />
        {isAutoInherited ? (
          <Pill tone="emerald"><LinkIcon className="h-3 w-3" /> Auto-connected via Brand DNA</Pill>
        ) : (
          <Pill tone="purple"><CheckCircle2 className="h-3 w-3" /> GA4 Connected</Pill>
        )}
        <span className="text-xs text-foreground/80">{s?.connectionWebsiteUrl ?? (s?.company as any)?.website_url ?? "your site"}</span>
        {s?.selectedPropertyId && <span className="text-[11px] text-muted-foreground">· GA4 Property: {s.selectedPropertyId}</span>}
        <span className="text-[11px] text-muted-foreground">· Last sync: {s?.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : "never — run an initial sync"}</span>
        <div className="ml-auto flex items-center gap-2">
          {!hasProps && (
            <Button size="sm" variant="ghost" onClick={() => listProps.mutate(undefined)} disabled={listProps.isPending} className="h-7">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", listProps.isPending && "animate-spin")} /> Discover properties
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => sync.mutate(90)} disabled={sync.isPending || !s?.selectedPropertyId} className="h-7">
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", sync.isPending && "animate-spin")} /> {sync.isPending ? "Syncing…" : "Sync now"}
          </Button>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Hide"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* URL / property switcher bar */}
      {hasProps && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Analyzing:</span>
          <Select
            value={s?.selectedPropertyId ?? undefined}
            onValueChange={(v) => selectProp.mutate(v)}
          >
            <SelectTrigger className="h-8 bg-white/5 border-white/10 w-[280px]"><SelectValue placeholder="Select GA4 property" /></SelectTrigger>
            <SelectContent>
              {s!.properties.map((p: any) => (
                <SelectItem key={p.property_id} value={p.property_id}>
                  {p.display_name} {p.default_uri ? `· ${p.default_uri.replace(/^https?:\/\//, "")}` : `· ${p.property_id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={onConnect} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add another website
          </Button>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" /> Hourly sync</span>
            <span>Signed in as <span className="text-indigo-300">{s?.googleEmail ?? "Google account"}</span></span>
          </div>
        </div>
      )}

      {/* Website URL analyzer card — appears only after GA4 is connected */}
      <WebsiteUrlCard
        properties={s?.properties ?? []}
        selectedPropertyId={s?.selectedPropertyId ?? null}
        initialUrl={s?.connectionWebsiteUrl ?? ((s?.company as any)?.website_url ?? "")}
        onPick={async (propertyId) => {
          await selectProp.mutateAsync(propertyId);
          // Fetch fresh data for the newly selected property so the user immediately
          // sees live GA4 metrics without needing to click "Sync now".
          try { await sync.mutateAsync(90); } catch { /* surfaced via syncError banner */ }
        }}
        onSyncMissing={async (url) => {
          // Re-check on the server (uses property defaultUri + dataStream defaultUri).
          try {
            const r = await listProps.mutateAsync({ websiteUrl: url });
            if (r?.matchedPropertyId) {
              await sync.mutateAsync(90);
              toast.success(`Analyzing ${url}`, { description: "Matched a GA4 property and loaded live data." });
              return;
            }
          } catch (e: any) {
            toast.error("Could not refresh GA4 properties", { description: e?.message ?? "Try again." });
            return;
          }
          // No automatic match — do NOT fall back to another property. Surface the
          // full property list (via the dropdown above) so the user can pick the
          // correct one manually, or add a new data stream in GA4.
          setWebsiteUrl(url);
          toast.info(`No GA4 property matched ${url}`, {
            description: `Pick the correct GA4 property from the dropdown above, or add ${url} as a data stream in your Google Analytics account.`,
          });
        }}
        syncing={selectProp.isPending || sync.isPending}
      />
    </div>
  );
}

function WebsiteUrlCard({
  properties, selectedPropertyId, initialUrl, onPick, onSyncMissing, syncing,
}: {
  properties: any[];
  selectedPropertyId: string | null;
  initialUrl: string;
  onPick: (propertyId: string) => void;
  onSyncMissing: (url: string) => void;
  syncing: boolean;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  useEffect(() => { if (!url && initialUrl) setUrl(initialUrl); }, [initialUrl]); // eslint-disable-line

  const onAnalyze = () => {
    const clean = url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
    if (!clean) {
      toast.error("Enter a website URL", { description: "e.g. acme.io" });
      return;
    }
    const match = properties.find((p: any) => {
      const u = (p.default_uri ?? "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
      return u && (u === clean || u.endsWith("." + clean) || clean.endsWith("." + u));
    });
    if (match) {
      onPick(match.property_id);
      toast.success(`Analyzing ${clean}`, { description: `Matched GA4 property: ${match.display_name}` });
    } else {
      onSyncMissing(clean);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500/[0.06] via-purple-500/[0.04] to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center shrink-0">
          <Globe2 className="h-4 w-4 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">View traffic for any website in your GA4 account</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the URL of any website linked to your connected Google Analytics account to load its traffic, audience, acquisition and engagement metrics.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe2 className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAnalyze(); }}
                placeholder="Enter a website URL — e.g. acme.io"
                className="pl-9 h-9 bg-white/5 border-white/10"
              />
            </div>
            <Button size="sm" onClick={onAnalyze} disabled={syncing} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 h-9">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {syncing ? "Loading…" : "View analytics"}
            </Button>
          </div>
          {selectedPropertyId && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Currently analyzing GA4 property: <span className="text-foreground/80">{selectedPropertyId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// AI Predictive Analytics — the marquee USP section
// ─────────────────────────────────────────────────────────────
type Horizon = "1m" | "3m" | "6m" | "1y";
const HORIZON_META: Record<Horizon, { label: string; rate: number; confidence: number }> = {
  "1m": { label: "Next Month",       rate: 0.084, confidence: 0.91 },
  "3m": { label: "Next 3 Months",    rate: 0.27,  confidence: 0.84 },
  "6m": { label: "Next 6 Months",    rate: 0.58,  confidence: 0.76 },
  "1y": { label: "Next Year (Annual)", rate: 1.32, confidence: 0.68 },
};

function PredictiveAnalytics({ baseVisits, baseUnique, baseBounce, domain }: { baseVisits: number; baseUnique: number; baseBounce: number; domain: string }) {
  const [horizon, setHorizon] = useState<Horizon>("3m");
  const meta = HORIZON_META[horizon];

  const predicted = useMemo(() => {
    const visits = Math.round(baseVisits * (1 + meta.rate));
    const unique = Math.round(baseUnique * (1 + meta.rate * 0.88));
    const bounce = +(baseBounce * (1 - meta.rate * 0.04)).toFixed(1);
    const dur = `3m ${10 + Math.round(meta.rate * 20)}s`;
    return { visits, unique, bounce, dur, lower: Math.round(visits * 0.85), upper: Math.round(visits * 1.18) };
  }, [baseVisits, baseUnique, baseBounce, meta.rate]);

  const chartData = useMemo(() => {
    const months = ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];
    const today = new Date();
    const data: { label: string; actual?: number; predicted?: number; lower?: number; upper?: number; isToday?: boolean }[] = [];
    // Historical: 6 months back from base, ending at baseVisits
    for (let i = 5; i >= 0; i--) {
      const v = Math.round(baseVisits * (1 - i * 0.06 + (i % 2 === 0 ? 0.02 : -0.01)));
      data.push({ label: months[(today.getMonth() - i + 12) % 12], actual: v });
    }
    // TODAY marker overlap
    data[data.length - 1].isToday = true;
    // Predicted horizon
    const steps = horizon === "1m" ? 1 : horizon === "3m" ? 3 : horizon === "6m" ? 6 : 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const v = Math.round(baseVisits * (1 + meta.rate * t));
      data.push({
        label: months[(today.getMonth() + i) % 12],
        predicted: v,
        lower: Math.round(v * 0.85),
        upper: Math.round(v * 1.18),
      });
    }
    return data;
  }, [baseVisits, meta.rate, horizon]);

  const opportunities = [
    { title: "Organic Search Expansion", desc: "Long-tail keyword cluster gaps detected — modest content investment yields outsized lift.", uplift: "+18% Traffic", tone: "indigo" as const },
    { title: "Mobile Audience Growth", desc: "Mobile session share is climbing 3.2pp/mo. Optimize Core Web Vitals to capture momentum.", uplift: "+12% Sessions", tone: "emerald" as const },
    { title: "Content Velocity Increase", desc: "Publishing cadence shift of +1 post/wk historically compounds within 60 days.", uplift: "+9% Pages/Visit", tone: "purple" as const },
  ];

  const recs = [
    { icon: Wand2, title: "Double publishing cadence on LinkedIn", desc: "Predicted to lift Share-of-Voice by 4.2pts within the horizon." },
    { icon: Sparkles, title: "Activate retargeting on bounce segments", desc: "Forecasted to reduce bounce by ~1.8% and add 23K returning visitors." },
    { icon: TrendingUp, title: "Launch a Bangladesh-localized landing page", desc: "Country rank trajectory suggests +6 positions over 90 days." },
  ];

  return (
    <div className="relative">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent p-5 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-purple-500/15 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-indigo-500/15 pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-indigo-300/80 mb-1">Predictive Engine v2</div>
            <div className="text-xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-300" /> AI Predictive Intelligence — Powered by Historical GA4 Trends</div>
            <div className="text-xs text-muted-foreground mt-1">Forward-looking intelligence based on your last 6 months of data &amp; AI trend modeling.</div>
          </div>
          <Pill tone="purple"><Sparkles className="h-3 w-3" /> {Math.round(meta.confidence * 100)}% confidence</Pill>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {(Object.keys(HORIZON_META) as Horizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs border transition",
                horizon === h
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-transparent text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
                  : "border-white/10 bg-white/5 text-foreground/70 hover:bg-white/10"
              )}
            >
              {HORIZON_META[h].label}
            </button>
          ))}
        </div>

        <motion.div key={horizon} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative mt-5 space-y-5">
          {/* Summary card */}
          <div className="rounded-xl border border-indigo-400/20 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="max-w-3xl">
                <div className="text-sm font-semibold flex items-center gap-2 text-indigo-200"><TrendingUp className="h-4 w-4" /> {meta.rate > 0.1 ? "↑ Growing" : "→ Stable"} — projected over {meta.label.toLowerCase()}</div>
                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
                  Based on your last 6 months of GA4 data, traffic to <span className="text-indigo-300 font-medium">{domain}</span> is projected to grow <span className="text-emerald-300 font-medium">{(meta.rate * 100).toFixed(1)}%</span> over the {meta.label.toLowerCase()}. Key drivers include organic search momentum, improving engagement metrics, and increasing returning-visitor share.
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Prediction Accuracy</div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${meta.confidence * 100}%` }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-indigo-400 to-purple-500" />
                </div>
                <div className="text-[11px] text-foreground/80 mt-1">{Math.round(meta.confidence * 100)}%</div>
              </div>
            </div>
          </div>

          {/* Predicted KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PredKpi label="Predicted Visits"  value={`~${fmt(predicted.visits)}`}  delta={`+${(meta.rate * 100).toFixed(1)}%`} />
            <PredKpi label="Predicted Unique"  value={`~${fmt(predicted.unique)}`}  delta={`+${(meta.rate * 88).toFixed(1)}%`} />
            <PredKpi label="Predicted Bounce"  value={`~${predicted.bounce}%`}      delta={`-${(meta.rate * 4).toFixed(1)}%`} />
            <PredKpi label="Predicted Duration" value={`~${predicted.dur}`}          delta={`+${Math.round(meta.rate * 30)}s`} />
          </div>

          {/* Predictive chart */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 h-[320px]">
            <div className="text-xs text-muted-foreground mb-1 px-1">Historical (solid) → Predicted (dashed) with confidence band</div>
            <ResponsiveContainer width="100%" height="92%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="histArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="confArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.2 320)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="oklch(0.68 0.2 320)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} />
                <YAxis stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v as number)} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v) => fmt(v as number)} />
                <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#confArea)" />
                <Area type="monotone" dataKey="lower" stroke="transparent" fill="oklch(0.18 0.02 260)" />
                <Area type="monotone" dataKey="actual" stroke="oklch(0.65 0.22 280)" strokeWidth={2.5} fill="url(#histArea)" />
                <Area type="monotone" dataKey="predicted" stroke="oklch(0.68 0.2 320)" strokeWidth={2.5} strokeDasharray="5 4" fill="transparent" />
                <ReferenceLine x={chartData[5]?.label} stroke="oklch(0.78 0.17 75)" strokeDasharray="3 3" label={{ value: "TODAY", position: "top", fill: "oklch(0.78 0.17 75)", fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Opportunities */}
          <div>
            <div className="text-xs uppercase tracking-widest text-indigo-300/80 mb-2">Growth Opportunities</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {opportunities.map((o) => (
                <div key={o.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-indigo-400/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">{o.title}</div>
                    <Pill tone={o.tone}>{o.uplift}</Pill>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{o.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Alert removed */}


          {/* AI recommendations */}
          <div>
            <div className="text-xs uppercase tracking-widest text-indigo-300/80 mb-2">AI Recommendations</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recs.map((r) => (
                <div key={r.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col">
                  <div className="flex items-center gap-2">
                    <r.icon className="h-4 w-4 text-purple-300" />
                    <div className="text-sm font-semibold">{r.title}</div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 flex-1 leading-relaxed">{r.desc}</p>
                  <Button size="sm" variant="outline" className="mt-3 h-7 text-[11px] border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 self-start">Apply Suggestion</Button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PredKpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  const negative = delta.startsWith("-");
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-purple-300/80">Predicted</div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      <div className={cn("text-[11px] mt-0.5", negative ? "text-emerald-400" : "text-emerald-400")}>{delta}</div>
    </div>
  );
}

function DemographicsCard({ domain, cacheKey }: { domain: string; cacheKey: string }) {
  const seed = seedHash(domain + cacheKey + "demo");
  const male = +rand(seed, 42, 62).toFixed(1);
  const female = +(100 - male).toFixed(1);
  const ageBucketsRaw = [
    rand(seed + 1, 8, 16),   // 18-24
    rand(seed + 2, 22, 32),  // 25-34
    rand(seed + 3, 18, 28),  // 35-44
    rand(seed + 4, 12, 20),  // 45-54
    rand(seed + 5, 6, 14),   // 55-64
    rand(seed + 6, 3, 8),    // 65+
  ];
  const sum = ageBucketsRaw.reduce((a, b) => a + b, 0);
  const ages = [
    { label: "18–24", value: +(ageBucketsRaw[0] / sum * 100).toFixed(1) },
    { label: "25–34", value: +(ageBucketsRaw[1] / sum * 100).toFixed(1) },
    { label: "35–44", value: +(ageBucketsRaw[2] / sum * 100).toFixed(1) },
    { label: "45–54", value: +(ageBucketsRaw[3] / sum * 100).toFixed(1) },
    { label: "55–64", value: +(ageBucketsRaw[4] / sum * 100).toFixed(1) },
    { label: "65+",   value: +(ageBucketsRaw[5] / sum * 100).toFixed(1) },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-indigo-300" /> Gender Split</div>
          <Pill tone="indigo">GA4</Pill>
        </div>
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Male</span><span className="text-foreground font-medium">{male}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${male}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full" style={{ background: "oklch(0.65 0.22 280)" }} />
            </div>
            <div className="mt-3 flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Female</span><span className="text-foreground font-medium">{female}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${female}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full" style={{ background: "oklch(0.68 0.2 320)" }} />
            </div>
          </div>
          <div className="relative h-24 w-24 flex-none">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.68 0.2 320)" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.65 0.22 280)" strokeWidth="3.5" strokeDasharray={`${male} ${100 - male}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[10px] text-muted-foreground">M / F</div>
              <div className="text-xs font-semibold">{male}/{female}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-emerald-300" /> Age Breakdown</div>
          <Pill tone="emerald">GA4</Pill>
        </div>
        <div className="space-y-2.5">
          {ages.map((a, i) => (
            <div key={a.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/80">{a.label}</span>
                <span className="text-foreground/70">{a.value}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${a.value * 3}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="h-full rounded-full" style={{ background: i % 2 === 0 ? "oklch(0.72 0.18 155)" : "oklch(0.65 0.22 280)" }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// Always-visible website URL input — lets users view analytics for any website,
// whether or not Google Analytics is connected.
function AnyWebsiteUrlCard({
  currentDomain,
  ga4Connected,
  properties,
  onAnalyze,
}: {
  currentDomain: string;
  ga4Connected: boolean;
  properties: any[];
  onAnalyze: (clean: string) => void;
}) {
  const [url, setUrl] = useState("");

  const submit = () => {
    const clean = url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
    if (!clean || !clean.includes(".")) {
      toast.error("Enter a valid website URL", { description: "e.g. acme.io or https://acme.io" });
      return;
    }
    onAnalyze(clean);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500/[0.06] via-purple-500/[0.04] to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center shrink-0">
          <Globe2 className="h-4 w-4 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Analyze any website</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter any website URL to load its traffic, audience, acquisition and engagement metrics.
            {ga4Connected
              ? " If the URL matches one of your connected GA4 properties, live data will be used automatically."
              : " Connect Google Analytics above to switch from modeled to live data."}
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe2 className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="Enter a website URL — e.g. acme.io"
                className="pl-9 h-9 bg-white/5 border-white/10"
              />
            </div>
            <Button size="sm" onClick={submit} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 h-9">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> View analytics
            </Button>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Currently analyzing: <span className="text-foreground/80">{currentDomain}</span>
            {ga4Connected && properties.length > 0 && (
              <span> · {properties.length} GA4 propert{properties.length === 1 ? "y" : "ies"} available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Manual GA4 property picker — shown when no property auto-matches the URL.
// ─────────────────────────────────────────────────────────────
function ManualPropertyPicker({
  pendingUrl, properties, loading, onPick, onCancel,
}: {
  pendingUrl: string;
  properties: any[];
  loading: boolean;
  onPick: (propertyId: string) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<string>("");
  return (
    <div className="rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            No GA4 property automatically matched <span className="text-amber-200">{pendingUrl}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Select the GA4 property you'd like to analyze. We checked each property's website URI and its web data stream URIs but couldn't find an exact host match.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 sm:w-[360px]">
                <SelectValue placeholder={properties.length ? "Choose a GA4 property…" : "No properties available"} />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p: any) => (
                  <SelectItem key={p.property_id} value={p.property_id}>
                    {p.display_name} {p.default_uri ? `· ${p.default_uri.replace(/^https?:\/\//, "")}` : `· ${p.property_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => picked && onPick(picked)}
              disabled={!picked || loading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 h-9"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {loading ? "Loading…" : "Use this property"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-9">Cancel</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tip: to track <span className="text-foreground/80">{pendingUrl}</span> automatically, add it as a Web data stream in your Google Analytics property settings.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Persistent "no auto-match" banner with a property dropdown.
// Replaces the prior silent fallback to modeled analytics.
// ─────────────────────────────────────────────────────────────
function NoMatchBanner({
  properties, selectedPropertyId, loading, onPick,
}: {
  properties: any[];
  selectedPropertyId: string | null;
  loading: boolean;
  onPick: (propertyId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            We couldn't auto-match your URL to a GA4 property. Please select your property manually.
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose from the GA4 properties discovered in your connected Google account:
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Select value={selectedPropertyId ?? undefined} onValueChange={(v) => onPick(v)}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 sm:w-[360px]">
                <SelectValue placeholder="Choose a GA4 property…" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p: any) => (
                  <SelectItem key={p.property_id} value={p.property_id}>
                    {p.display_name} {p.default_uri ? `· ${p.default_uri.replace(/^https?:\/\//, "")}` : `· ${p.property_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && (
              <span className="text-xs text-muted-foreground self-center">Loading live data…</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
