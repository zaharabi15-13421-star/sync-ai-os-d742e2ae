import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Globe, Loader2, RefreshCw, ExternalLink, Palette, Type, LinkIcon,
  Sparkles, Search, Check, X, Trash2, History, FileText, Heart,
  Zap, Mail, Phone, MessageCircle, MapPin, Share2, Settings2,
  TrendingUp, TrendingDown, Minus, Download, Calendar, BarChart3,
  Lightbulb, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  analyzeWebsite,
  getLatestWebsiteAnalysis,
  getWebsiteAnalysisHistory,
  getWebsiteAnalysisById,
  removeWebsiteAnalysis,
  resolveBrandWebsite,
} from "@/lib/website-analysis.functions";
import {
  suggestBrands,
  generateBrandIntelligence,
  generateSeoData,
} from "@/lib/website-intelligence.functions";
import { BrandDetailsTab } from "@/components/brand-details/BrandDetailsTab";
import { BrandSummaryExtensions } from "@/components/brand-summary/BrandSummaryExtensions";

export const Route = createFileRoute("/dashboard/website-analysis")({
  component: WebsiteIntelligencePage,
});

const PROGRESS_STEPS = [
  "Visiting your website",
  "Reading your content and copy",
  "Picking up your brand colors and fonts",
  "Checking your SEO basics",
  "Writing your brand summary",
];

function favicon(url?: string | null, size = 64) {
  try {
    const u = new URL(url ?? "");
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=${size}`;
  } catch {
    return "";
  }
}
function faviconFromDomain(domain: string, size = 64) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
function domainOf(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}
function ensureUrl(d: string) {
  if (/^https?:\/\//i.test(d)) return d;
  return `https://${d}`;
}

function WebsiteIntelligencePage() {
  const [tab, setTab] = useState<"brand" | "details" | "seo">("brand");
  const [sharedUrl, setSharedUrl] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-purple-200">
          <Sparkles className="h-3 w-3" /> Brand DNA
        </div>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
          Understand Your Brand DNA in Seconds
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Get a clear, plain-English read on your brand, SEO and competitors — built for founders, not marketers.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "brand" | "details" | "seo")} className="w-full">
        <TabsList className="bg-white/[0.04] border border-white/10 p-1 rounded-full">
          <TabsTrigger
            value="brand"
            className="rounded-full px-5 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Brand Summary
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="rounded-full px-5 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Brand Details
          </TabsTrigger>
          <TabsTrigger
            value="seo"
            className="rounded-full px-5 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Dynamic SEO Keyword Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-6">
          <BrandSummaryTab sharedUrl={sharedUrl} setSharedUrl={setSharedUrl} />
        </TabsContent>
        <TabsContent value="details" className="mt-6">
          <BrandDetailsTab />
        </TabsContent>
        <TabsContent value="seo" className="mt-6">
          <SeoTrackerTab sharedUrl={sharedUrl} setSharedUrl={setSharedUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
 * TAB 1 — BRAND SUMMARY
 * ============================================================ */
function BrandSummaryTab({
  sharedUrl, setSharedUrl,
}: { sharedUrl: string; setSharedUrl: (u: string) => void }) {
  const qc = useQueryClient();
  const fetchLatest = useServerFn(getLatestWebsiteAnalysis);
  const fetchHistory = useServerFn(getWebsiteAnalysisHistory);
  const fetchById = useServerFn(getWebsiteAnalysisById);
  const runRemove = useServerFn(removeWebsiteAnalysis);
  const runResolve = useServerFn(resolveBrandWebsite);
  const runAnalysis = useServerFn(analyzeWebsite);
  const runSuggest = useServerFn(suggestBrands);
  const runIntel = useServerFn(generateBrandIntelligence);

  const [websiteUrl, setWebsiteUrlLocal] = useState(sharedUrl);
  const [brandName, setBrandName] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Brand autocomplete
  const [openSuggest, setOpenSuggest] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; domain: string; industry: string }>>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const suggestBoxRef = useRef<HTMLDivElement>(null);

  const setWebsiteUrl = (u: string) => {
    setWebsiteUrlLocal(u);
    setSharedUrl(u);
  };

  // Debounced suggestions
  useEffect(() => {
    const q = brandName.trim();
    if (q.length < 2) { setSuggestions([]); setOpenSuggest(false); return; }
    const t = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const r: any = await runSuggest({ data: { query: q } });
        setSuggestions(r?.suggestions ?? []);
        setOpenSuggest((r?.suggestions ?? []).length > 0);
        setHighlight(0);
      } catch { /* silent */ }
      setLoadingSuggest(false);
    }, 300);
    return () => clearTimeout(t);
  }, [brandName, runSuggest]);

  // Outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!suggestBoxRef.current?.contains(e.target as Node)) setOpenSuggest(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pickSuggestion = (s: { name: string; domain: string }) => {
    setBrandName(s.name);
    setWebsiteUrl(ensureUrl(s.domain));
    setOpenSuggest(false);
    setBrandError(null);
    setUrlError(null);
  };

  const latest = useQuery({
    queryKey: ["website-analysis", "latest"],
    queryFn: () => fetchLatest(),
    staleTime: 30_000,
  });
  const history = useQuery({
    queryKey: ["website-analysis", "history"],
    queryFn: () => fetchHistory(),
    staleTime: 30_000,
  });
  const selected = useQuery({
    queryKey: ["website-analysis", "by-id", selectedId],
    queryFn: () => fetchById({ data: { id: selectedId! } }),
    enabled: !!selectedId,
  });

  const resolveMutation = useMutation({
    mutationFn: (name: string) => runResolve({ data: { brandName: name } }) as any,
    onSuccess: (res: any) => {
      if (res?.url) { setWebsiteUrl(res.url); setBrandError(null); }
    },
    onError: (e: unknown) => setBrandError(e instanceof Error ? e.message : "Could not find website"),
  });

  const analysisMutation = useMutation({
    mutationFn: (payload: { websiteUrl?: string; brandName?: string }) => runAnalysis({ data: payload }) as any,
    onSuccess: () => {
      toast.success("Analysis complete");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["website-analysis"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setUrlError(msg);
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (!analysisMutation.isPending) { setProgressIdx(0); return; }
    setProgressIdx(0);
    const id = setInterval(() => setProgressIdx((i) => (i < PROGRESS_STEPS.length - 1 ? i + 1 : i)), 900);
    return () => clearInterval(id);
  }, [analysisMutation.isPending]);

  const canRun = (websiteUrl.trim().length > 0 || brandName.trim().length > 0) && !analysisMutation.isPending;

  const handleRun = async () => {
    setUrlError(null); setBrandError(null);
    let url = websiteUrl.trim();
    if (!url && brandName.trim()) {
      try {
        const res: any = await resolveMutation.mutateAsync(brandName.trim());
        url = res?.url ?? "";
      } catch { return; }
    }
    analysisMutation.mutate({
      websiteUrl: url || undefined,
      brandName: brandName.trim() || undefined,
    });
  };

  const activeAnalysis: any = selectedId ? selected.data?.analysis : latest.data?.analysis;
  const hasHistory = (history.data?.history?.length ?? 0) > 0;

  // Sync sharedUrl when an analysis loads
  useEffect(() => {
    if (activeAnalysis?.url && !sharedUrl) setSharedUrl(activeAnalysis.url);
  }, [activeAnalysis?.url, sharedUrl, setSharedUrl]);

  // Brand intelligence (parallel, after analysis)
  const intelQuery = useQuery({
    queryKey: ["brand-intel", activeAnalysis?.id],
    enabled: !!activeAnalysis && activeAnalysis.status === "completed",
    staleTime: 5 * 60_000,
    queryFn: () =>
      runIntel({
        data: {
          url: activeAnalysis.url,
          title: activeAnalysis.title ?? undefined,
          summary: activeAnalysis.summary ?? undefined,
          markdown: activeAnalysis.markdown ?? undefined,
        },
      }),
  });

  return (
    <div className="space-y-6">
      {/* Inputs card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Website Link</label>
            <Input
              value={websiteUrl}
              onChange={(e) => { setWebsiteUrl(e.target.value); setUrlError(null); }}
              placeholder="e.g. https://yourwebsite.com"
              className="mt-1.5 h-11 bg-white/[0.04] border-white/10"
            />
            {urlError && <div className="mt-1.5 text-xs text-rose-300">{urlError}</div>}
          </div>

          <div ref={suggestBoxRef} className="relative">
            <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Brand Name</label>
            <div className="relative">
              <Input
                value={brandName}
                onChange={(e) => { setBrandName(e.target.value); setBrandError(null); }}
                onFocus={() => suggestions.length > 0 && setOpenSuggest(true)}
                onKeyDown={(e) => {
                  if (!openSuggest) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); if (suggestions[highlight]) pickSuggestion(suggestions[highlight]); }
                  else if (e.key === "Escape") setOpenSuggest(false);
                }}
                placeholder="e.g. Creative IT, Your Company"
                className="mt-1.5 h-11 pr-9 bg-white/[0.04] border-white/10"
              />
              {(loadingSuggest || resolveMutation.isPending) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {brandError && <div className="mt-1.5 text-xs text-rose-300">{brandError}</div>}

            {openSuggest && suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#15152a] shadow-xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    type="button"
                    key={`${s.domain}-${i}`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickSuggestion(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${i === highlight ? "bg-purple-500/15" : "hover:bg-white/[0.04]"}`}
                  >
                    <img src={faviconFromDomain(s.domain, 32)} alt="" className="h-6 w-6 rounded" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.domain} · {s.industry}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <Button
            onClick={handleRun}
            disabled={!canRun}
            size="lg"
            className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_24px_-6px_rgba(124,58,237,0.6)]"
          >
            {analysisMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analysing…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Run Analysis</>
            )}
          </Button>
        </div>
      </div>

      {/* Recent */}
      {hasHistory && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-purple-300" />
            <div className="text-sm font-medium">Recent Analyses</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.data!.history.map((h: any) => (
              <div
                key={h.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-purple-400/40 hover:shadow-[0_0_0_2px_rgba(124,58,237,0.18)] transition cursor-pointer"
                onClick={() => setSelectedId(h.id)}
              >
                <div className="flex items-start gap-3">
                  {favicon(h.url) && <img src={favicon(h.url)} alt="" className="h-7 w-7 rounded-md border border-white/10" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{h.title ?? domainOf(h.url)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{domainOf(h.url)}</div>
                  </div>
                </div>
                {h.summary && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{h.summary}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">
                    {h.analyzed_at ? new Date(h.analyzed_at).toLocaleDateString() : ""}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                      onClick={(e) => { e.stopPropagation(); analysisMutation.mutate({ websiteUrl: h.url }); }}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Re-run
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-rose-300 hover:text-rose-200"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await runRemove({ data: { id: h.id } });
                          toast.success("Removed");
                          if (selectedId === h.id) setSelectedId(null);
                          qc.invalidateQueries({ queryKey: ["website-analysis"] });
                        } catch (err) { toast.error(err instanceof Error ? err.message : "Could not remove"); }
                      }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {analysisMutation.isPending && <ProgressPanel idx={progressIdx} />}

      {/* Empty */}
      {!analysisMutation.isPending && !activeAnalysis && !hasHistory && <EmptyState />}

      {/* Results */}
      {!analysisMutation.isPending && activeAnalysis?.status === "completed" && (
        <Results
          analysis={activeAnalysis}
          intel={intelQuery.data as any}
          intelLoading={intelQuery.isLoading}
          onRerun={() => analysisMutation.mutate({ websiteUrl: activeAnalysis.url })}
        />
      )}

      {!analysisMutation.isPending && activeAnalysis?.status === "failed" && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-200">
          {activeAnalysis.error ?? "Analysis failed. Please try again."}
        </div>
      )}
    </div>
  );
}

function ProgressPanel({ idx }: { idx: number }) {
  const pct = Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
        Working on your analysis…
      </div>
      <Progress value={pct} className="mt-4" />
      <ul className="mt-4 space-y-2">
        {PROGRESS_STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 text-sm transition ${i <= idx ? "text-foreground" : "text-muted-foreground/50"}`}>
            {i < idx ? <Check className="h-4 w-4 text-emerald-400" /> :
              i === idx ? <Loader2 className="h-4 w-4 animate-spin text-purple-300" /> :
              <span className="h-2 w-2 rounded-full bg-white/20 ml-1" />}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 md:p-10 text-center">
      <Globe className="h-10 w-10 mx-auto text-purple-300/70" />
      <h2 className="mt-4 text-xl md:text-2xl font-semibold">Analyse Any Website in Seconds</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
        Type your website link or brand name above and instantly see your brand colors, fonts, content summary, competitors, and SEO basics.
      </p>
    </div>
  );
}

/* ============ Results ============ */
function Results({
  analysis, intel, intelLoading, onRerun,
}: { analysis: any; intel: any; intelLoading: boolean; onRerun: () => void }) {
  const a = analysis;
  const branding = (a?.branding ?? {}) as any;
  const palette: Record<string, string> = branding?.colors ?? {};
  const fonts: Array<{ family?: string }> = branding?.fonts ?? [];
  const links: string[] = Array.isArray(a?.links) ? a.links : [];

  const grouped = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const l of links) { const d = domainOf(l); (g[d] ||= []).push(l); }
    return Object.entries(g).sort((x, y) => y[1].length - x[1].length);
  }, [links]);

  const fontLabel = (i: number) => i === 0 ? "Used for headings" : i === 1 ? "Used for body text" : "Used for accents";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Showing latest analysis</div>
        <Button onClick={onRerun} size="sm" variant="outline">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-run Analysis
        </Button>
      </div>

      {/* Page info */}
      <SectionCard>
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live homepage analysis
        </div>
        <h2 className="mt-2 text-lg font-semibold">{a.title ?? a.url}</h2>
        <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-purple-300 hover:underline inline-flex items-center gap-1 mt-1">
          {a.url} <ExternalLink className="h-3 w-3" />
        </a>
        {a.description && <p className="text-sm mt-3 text-foreground/90">{a.description}</p>}
        <div className="mt-3 text-[11px] text-muted-foreground">
          Analyzed {a.analyzed_at ? new Date(a.analyzed_at).toLocaleString() : "—"}
        </div>
      </SectionCard>

      {/* R1 Summary */}
      {a.summary && (
        <SectionCard>
          <SectionHeader icon={<FileText className="h-4 w-4 text-purple-300" />} title="What Your Website Says About Your Business" />
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{a.summary}</p>
        </SectionCard>
      )}

      {/* R2 Colors */}
      <SectionCard>
        <SectionHeader icon={<Palette className="h-4 w-4 text-purple-300" />} title="Brand Colors" />
        {Object.keys(palette).length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">No palette detected.</div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-5">
            {Object.entries(palette).map(([k, v]) => (
              <div key={k} className="flex flex-col items-center w-24">
                <div className="h-14 w-14 rounded-full border border-white/15 shadow-inner" style={{ background: String(v) }} />
                <div className="mt-2 text-xs font-medium capitalize text-center">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* R3 Typography */}
      <SectionCard>
        <SectionHeader icon={<Type className="h-4 w-4 text-purple-300" />} title="Typography" />
        {fonts.length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">No fonts detected.</div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {fonts.slice(0, 6).map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                <span className="text-sm" style={{ fontFamily: f.family ?? undefined }}>{f.family ?? "—"}</span>
                <span className="text-[11px] text-muted-foreground">{fontLabel(i)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* R4 Links */}
      <SectionCard>
        <div className="flex items-center gap-2 text-sm font-medium">
          <LinkIcon className="h-4 w-4 text-purple-300" /> Where Your Website Links To
          <span className="ml-auto text-[11px] text-muted-foreground">{links.length} links</span>
        </div>
        {grouped.length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">No outbound links found.</div>
        ) : (
          <div className="mt-4 space-y-4 max-h-80 overflow-auto pr-1">
            {grouped.map(([dom, urls]) => (
              <div key={dom}>
                <div className="text-xs font-medium text-foreground/90 flex items-center gap-2">
                  <img src={faviconFromDomain(dom, 32)} alt="" className="h-3.5 w-3.5" />
                  {dom}
                  <span className="text-[10px] text-muted-foreground">({urls.length})</span>
                </div>
                <ul className="mt-1.5 ml-5 space-y-0.5">
                  {urls.slice(0, 8).map((l) => (
                    <li key={l} className="text-[11px] text-muted-foreground truncate">
                      <a href={l} target="_blank" rel="noreferrer" className="hover:text-purple-300">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* R5 Brand Health */}
      <SectionCard>
        <SectionHeader
          icon={<Heart className="h-4 w-4 text-purple-300" />}
          title="Brand Health Score"
          subtitle="AI-generated quality rating across 5 brand dimensions"
        />
        {intelLoading ? <SkeletonBlock /> : intel?.health ? <HealthScore data={intel.health} /> : <NotReady />}
      </SectionCard>

      {/* R6 Competitors */}
      <SectionCard>
        <SectionHeader
          icon={<Zap className="h-4 w-4 text-purple-300" />}
          title="Competitor Snapshot"
          subtitle="Auto-detected competitors based on your industry, keywords, and services"
        />
        {intelLoading ? <SkeletonBlock /> : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(intel?.competitors ?? []).map((c: any, i: number) => (
              <a
                key={`${c.domain}-${i}`}
                href={ensureUrl(c.domain)} target="_blank" rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-purple-400/40 hover:shadow-[0_0_0_2px_rgba(124,58,237,0.25)] transition"
              >
                <div className="flex items-center gap-3">
                  <img src={faviconFromDomain(c.domain, 64)} alt="" className="h-9 w-9 rounded-lg border border-white/10" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.domain}</div>
                  </div>
                </div>
                {c.industry && <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{c.industry}</div>}
              </a>
            ))}
            {(!intel?.competitors || intel.competitors.length === 0) && <NotReady />}
          </div>
        )}
      </SectionCard>

      {/* R7 Contact */}
      <SectionCard>
        <SectionHeader icon={<FileText className="h-4 w-4 text-purple-300" />} title="Contact Information" />
        {intelLoading ? <SkeletonBlock /> : <ContactList c={intel?.contact} />}
      </SectionCard>

      {/* R8 Social */}
      <SectionCard>
        <SectionHeader icon={<Share2 className="h-4 w-4 text-purple-300" />} title="Social Media Presence" />
        {intelLoading ? <SkeletonBlock /> : <SocialChips list={intel?.social ?? []} />}
      </SectionCard>

      {/* R9 Tech */}
      <SectionCard>
        <SectionHeader
          icon={<Settings2 className="h-4 w-4 text-purple-300" />}
          title="Technology Stack"
          subtitle="Tools and platforms powering this website"
        />
        {intelLoading ? <SkeletonBlock /> : <TechStackGrid tech={intel?.techStack} />}
      </SectionCard>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">{children}</div>;
}
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium">{icon} {title}</div>
      {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
function SkeletonBlock() {
  return <div className="mt-4 h-24 rounded-xl bg-white/[0.04] animate-pulse" />;
}
function NotReady() {
  return <div className="mt-3 text-xs text-muted-foreground">Not enough data to display this section.</div>;
}

/* Health */
function HealthScore({ data }: { data: any }) {
  const overall = clamp(Number(data?.overall ?? 0));
  const sub = [
    { key: "messaging", label: "Messaging Clarity", value: clamp(Number(data?.messaging ?? 0)), tip: data?.tips?.messaging },
    { key: "visual", label: "Visual Consistency", value: clamp(Number(data?.visual ?? 0)), tip: data?.tips?.visual },
    { key: "seo", label: "SEO Readiness", value: clamp(Number(data?.seo ?? 0)), tip: data?.tips?.seo },
    { key: "trust", label: "Trust Signals", value: clamp(Number(data?.trust ?? 0)), tip: data?.tips?.trust },
    { key: "mobile", label: "Mobile-Friendliness", value: clamp(Number(data?.mobile ?? 0)), tip: data?.tips?.mobile },
  ];
  return (
    <div className="mt-4 grid gap-6 md:grid-cols-[200px_1fr] items-start">
      <Gauge value={overall} />
      <div className="space-y-4">
        {sub.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="font-mono text-xs" style={{ color: scoreColor(s.value) }}>{s.value}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${s.value}%`, background: scoreColor(s.value) }} />
            </div>
            {s.tip && <div className="mt-1 text-[11px] italic text-muted-foreground">{s.tip}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(isFinite(n) ? n : 0))); }
function scoreColor(v: number) { return v <= 40 ? "#EF4444" : v <= 70 ? "#F59E0B" : "#22C55E"; }
function Gauge({ value }: { value: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(value), 50);
    return () => clearTimeout(t);
  }, [value]);
  const r = 80, c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="relative h-[180px] w-[180px] mx-auto">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="14" fill="none" />
        <circle
          cx="100" cy="100" r={r} stroke={scoreColor(value)} strokeWidth="14" fill="none"
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[40px] font-semibold leading-none" style={{ color: scoreColor(value) }}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-1">/ 100</div>
      </div>
    </div>
  );
}

/* Contact */
function ContactList({ c }: { c?: any }) {
  const rows = [
    { icon: Mail, label: "Email", value: c?.email, link: c?.email ? `mailto:${c.email}` : null },
    { icon: Phone, label: "Phone", value: c?.phone, link: c?.phone ? `tel:${c.phone}` : null },
    { icon: MessageCircle, label: "WhatsApp", value: c?.whatsapp, link: c?.whatsapp ? `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}` : null },
    { icon: MapPin, label: "Address", value: c?.address, link: null },
  ];
  return (
    <div className="mt-4 divide-y divide-white/5">
      {rows.map(({ icon: Icon, label, value, link }) => (
        <div key={label} className="flex items-center gap-3 py-2.5">
          <Icon className="h-4 w-4 text-purple-300" />
          <div className="text-xs text-muted-foreground w-24">{label}</div>
          {value ? (
            link ? (
              <a href={link} className="text-sm text-foreground hover:text-purple-300 truncate" target="_blank" rel="noreferrer">{value}</a>
            ) : (
              <div className="text-sm text-foreground truncate">{value}</div>
            )
          ) : (
            <div className="text-sm italic text-muted-foreground">Not found</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* Social */
const SOCIAL_META: Record<string, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877F2" },
  instagram: { label: "Instagram", color: "#E4405F" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  youtube: { label: "YouTube", color: "#FF0000" },
  tiktok: { label: "TikTok", color: "#69C9D0" },
  twitter: { label: "Twitter / X", color: "#1DA1F2" },
  pinterest: { label: "Pinterest", color: "#E60023" },
};
function SocialChips({ list }: { list: Array<{ platform: string; url: string; handle: string }> }) {
  if (!list.length) return <div className="mt-3 text-xs text-muted-foreground">No social media links detected on this page.</div>;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {list.map((s, i) => {
        const meta = SOCIAL_META[s.platform?.toLowerCase()] ?? { label: s.platform, color: "#7C3AED" };
        return (
          <a key={i} href={s.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs hover:border-purple-400/40 transition"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
            <span className="font-medium">{meta.label}</span>
            {s.handle && <span className="text-muted-foreground">{s.handle}</span>}
          </a>
        );
      })}
    </div>
  );
}

/* Tech stack */
function TechStackGrid({ tech }: { tech?: any }) {
  if (!tech) return <NotReady />;
  const entries = Object.entries(tech) as Array<[string, Array<{ name: string; icon?: string }>]>;
  const flat = entries.flatMap(([cat, items]) => (items ?? []).map((it) => ({ ...it, category: cat })));
  if (flat.length === 0) return <NotReady />;
  return (
    <div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {flat.map((t, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-500/15 border border-purple-400/20 flex items-center justify-center text-sm">
            {t.icon ?? "⚙"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{t.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.category}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 * TAB 2 — SEO TRACKER
 * ============================================================ */
type SeoRange = "3d" | "7d" | "30d" | "3m" | "custom";

function SeoTrackerTab({
  sharedUrl, setSharedUrl,
}: { sharedUrl: string; setSharedUrl: (u: string) => void }) {
  const runSeo = useServerFn(generateSeoData);
  const [url, setUrl] = useState(sharedUrl);
  const [range, setRange] = useState<SeoRange>("7d");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [metric, setMetric] = useState<"volume" | "position" | "ctr">("volume");
  const [visibleRows, setVisibleRows] = useState(10);
  const [sortKey, setSortKey] = useState<"keyword" | "volume" | "position" | "change">("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => { if (sharedUrl && !url) setUrl(sharedUrl); }, [sharedUrl, url]);

  const customDays = useMemo(() => {
    if (!customRange) return 7;
    const from = new Date(customRange.from); const to = new Date(customRange.to);
    return Math.max(1, Math.min(90, Math.round((to.getTime() - from.getTime()) / 86400000) || 1));
  }, [customRange]);

  const seoQuery = useQuery({
    queryKey: ["seo", url, range, customDays],
    enabled: false,
    queryFn: () =>
      runSeo({ data: { url, range, days: range === "custom" ? customDays : undefined } }),
  });

  const runTrack = () => {
    if (!url.trim()) { toast.error("Please enter a website URL"); return; }
    setSharedUrl(url.trim());
    seoQuery.refetch();
  };

  const data: any = seoQuery.data;
  const keywords: any[] = data?.keywords ?? [];
  const stats = data?.stats;
  const insight = data?.insight;

  const sorted = useMemo(() => {
    const arr = [...keywords];
    arr.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av - bv) : (bv - av);
    });
    return arr;
  }, [keywords, sortKey, sortDir]);

  const exportCsv = () => {
    if (!keywords.length) return;
    const rows = [
      ["Keyword", "Search Volume", "Position", "Change", "Type"],
      ...sorted.slice(0, visibleRows).map((k) => [k.keyword, k.volume, k.position, k.change, k.type]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seo-keywords-${domainOf(url) || "site"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const RANGES: { key: SeoRange; label: string }[] = [
    { key: "3d", label: "3 Days" },
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "3m", label: "3 Months" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-5">
      {/* Input */}
      <SectionCard>
        <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Website URL</label>
        <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourwebsite.com"
            className="h-11 bg-white/[0.04] border-white/10" />
          <Button onClick={runTrack} disabled={seoQuery.isFetching} className="bg-purple-600 hover:bg-purple-500 text-white h-11 px-5">
            {seoQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Track Keywords
          </Button>
        </div>
        {data && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            Last updated: {seoQuery.dataUpdatedAt ? new Date(seoQuery.dataUpdatedAt).toLocaleString() : "—"}
          </div>
        )}
      </SectionCard>

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4 text-purple-300" /> Top SEO Keywords
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Most searched keywords driving traffic to this website</div>
        </div>
        <Button onClick={exportCsv} variant="outline" size="sm" disabled={!keywords.length}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatChip icon={<BarChart3 className="h-3.5 w-3.5" />} label="Total Keywords" value={String(stats.total ?? 0)} />
          <StatChip icon={<MapPin className="h-3.5 w-3.5" />} label="Avg. Position" value={Number(stats.avgPosition ?? 0).toFixed(1)} />
          <StatChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Top Keyword" value={String(stats.topKeyword ?? "—")} />
          <StatChip icon={<TrendingUp className="h-3.5 w-3.5" />} label="Trending ↑" value={String(stats.trendingUp ?? 0)} />
        </div>
      )}

      {/* Date filter */}
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRange(r.key);
                if (r.key === "custom") setShowCustom((s) => !s);
                else { setShowCustom(false); if (data) seoQuery.refetch(); }
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-medium border transition ${range === r.key
                ? "bg-purple-600 text-white border-purple-500"
                : "bg-transparent text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"}`}
            >
              {r.key === "custom" && <Calendar className="inline h-3 w-3 mr-1" />}
              {r.label}
            </button>
          ))}
        </div>
        {showCustom && (
          <div className="absolute z-20 mt-2 rounded-xl border border-white/10 bg-[#15152a] p-3 shadow-xl">
            <div className="flex gap-2 items-end">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">From</div>
                <Input type="date" className="h-9 bg-white/[0.04] border-white/10" value={customRange?.from ?? ""}
                  onChange={(e) => setCustomRange((p) => ({ from: e.target.value, to: p?.to ?? "" }))} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">To</div>
                <Input type="date" className="h-9 bg-white/[0.04] border-white/10" value={customRange?.to ?? ""}
                  onChange={(e) => setCustomRange((p) => ({ from: p?.from ?? "", to: e.target.value }))} />
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white"
                onClick={() => { setShowCustom(false); if (url) seoQuery.refetch(); }}>
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <SectionCard>
        {seoQuery.isFetching && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating keyword report…</div>}
        {!seoQuery.isFetching && !keywords.length && (
          <div className="text-xs text-muted-foreground">Enter a website URL and click "Track Keywords" to see results.</div>
        )}
        {keywords.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground border-b border-white/10">
                  <th className="py-2 pr-2">#</th>
                  <Th onClick={() => toggleSort("keyword", sortKey, sortDir, setSortKey, setSortDir)}>Keyword</Th>
                  <Th onClick={() => toggleSort("volume", sortKey, sortDir, setSortKey, setSortDir)}>Search Volume</Th>
                  <Th onClick={() => toggleSort("position", sortKey, sortDir, setSortKey, setSortDir)}>Position</Th>
                  <Th onClick={() => toggleSort("change", sortKey, sortDir, setSortKey, setSortDir)}>Change</Th>
                  <th className="py-2 pl-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, visibleRows).map((k, i) => (
                  <tr key={`${k.keyword}-${i}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 font-medium">{k.keyword}</td>
                    <td className="py-2.5">{formatVolume(k.volume)}</td>
                    <td className="py-2.5">{k.position}</td>
                    <td className="py-2.5"><ChangeCell value={Number(k.change)} /></td>
                    <td className="py-2.5 pl-2"><TypeBadge type={k.type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRows < sorted.length && (
              <div className="mt-3 text-center">
                <Button size="sm" variant="outline" onClick={() => setVisibleRows((n) => Math.min(50, n + 10))}>
                  <ChevronDown className="h-3 w-3 mr-1" /> Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Chart */}
      {data?.series?.length > 0 && (
        <SectionCard>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-medium">Trend</div>
            <div className="flex gap-1.5">
              {(["volume", "position", "ctr"] as const).map((m) => (
                <button key={m} onClick={() => setMetric(m)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${metric === m
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-transparent text-muted-foreground border-white/10"}`}>
                  {m === "volume" ? "Volume" : m === "position" ? "Position" : "CTR"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid stroke="#2D2D4E" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} reversed={metric === "position"} />
                <ReTooltip contentStyle={{ background: "#15152a", border: "1px solid #2D2D4E", borderRadius: 8 }} />
                <Line type="monotone" dataKey={metric} stroke="#7C3AED" strokeWidth={2} dot={false} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Insight */}
      {insight && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 border-l-[3px] border-l-purple-500">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-purple-300">
            <Lightbulb className="h-3.5 w-3.5" /> AI Insight
          </div>
          <p className="mt-2 text-sm leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-base font-semibold truncate">{value}</div>
    </div>
  );
}
function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <th className="py-2 cursor-pointer select-none hover:text-foreground" onClick={onClick}>{children}</th>;
}
function toggleSort(
  k: any, cur: any, dir: any,
  setK: (k: any) => void, setDir: (d: any) => void,
) {
  if (cur === k) setDir(dir === "asc" ? "desc" : "asc");
  else { setK(k); setDir("desc"); }
}
function formatVolume(n: number) {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
function ChangeCell({ value }: { value: number }) {
  if (!value || isNaN(value)) return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" /></span>;
  if (value > 0) return <span className="inline-flex items-center gap-1 text-emerald-400"><TrendingUp className="h-3 w-3" /> +{value}</span>;
  return <span className="inline-flex items-center gap-1 text-rose-400"><TrendingDown className="h-3 w-3" /> {value}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    primary: "bg-purple-600 text-white",
    secondary: "bg-blue-500 text-white",
    "long-tail": "bg-white/10 text-muted-foreground",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${map[type] ?? "bg-white/10 text-muted-foreground"}`}>{type ?? "—"}</span>;
}
