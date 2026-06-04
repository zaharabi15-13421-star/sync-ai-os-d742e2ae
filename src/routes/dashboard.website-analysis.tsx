import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Globe, Loader2, RefreshCw, ExternalLink, Palette, Type, LinkIcon,
  Sparkles, Search, Check, X, Trash2, History, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import {
  analyzeWebsite,
  getLatestWebsiteAnalysis,
  getWebsiteAnalysisHistory,
  getWebsiteAnalysisById,
  removeWebsiteAnalysis,
  resolveBrandWebsite,
} from "@/lib/website-analysis.functions";

export const Route = createFileRoute("/dashboard/website-analysis")({
  component: WebsiteAnalysisPage,
});

const PROGRESS_STEPS = [
  "Visiting your website",
  "Reading your content and copy",
  "Picking up your brand colors and fonts",
  "Checking your SEO basics",
  "Writing your brand summary",
];

const EXAMPLE_CARDS = [
  { brand: "Apple", url: "https://apple.com", summary: "Premium consumer technology brand focused on design, ecosystem, and simplicity." },
  { brand: "Stripe", url: "https://stripe.com", summary: "Developer-first payments platform with bold typography and clean product storytelling." },
  { brand: "Notion", url: "https://notion.so", summary: "All-in-one workspace blending docs, wikis and databases with a friendly visual tone." },
];

function favicon(url?: string | null) {
  try {
    const u = new URL(url ?? "");
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}

function domainOf(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}

function WebsiteAnalysisPage() {
  const qc = useQueryClient();
  const fetchLatest = useServerFn(getLatestWebsiteAnalysis);
  const fetchHistory = useServerFn(getWebsiteAnalysisHistory);
  const fetchById = useServerFn(getWebsiteAnalysisById);
  const runRemove = useServerFn(removeWebsiteAnalysis);
  const runResolve = useServerFn(resolveBrandWebsite);
  const runAnalysis = useServerFn(analyzeWebsite);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [resolvedHint, setResolvedHint] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    mutationFn: (name: string) => runResolve({ data: { brandName: name } }),
    onSuccess: (res: any) => {
      if (res?.url) {
        setWebsiteUrl(res.url);
        setResolvedHint(res.url);
        setBrandError(null);
      }
    },
    onError: (e: unknown) => setBrandError(e instanceof Error ? e.message : "Could not find website"),
  });

  const analysisMutation = useMutation({
    mutationFn: (payload: { websiteUrl?: string; brandName?: string }) =>
      runAnalysis({ data: payload }),
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

  // Animate progress steps while analyzing
  useEffect(() => {
    if (!analysisMutation.isPending) {
      setProgressIdx(0);
      return;
    }
    setProgressIdx(0);
    const id = setInterval(() => {
      setProgressIdx((i) => (i < PROGRESS_STEPS.length - 1 ? i + 1 : i));
    }, 1800);
    return () => clearInterval(id);
  }, [analysisMutation.isPending]);

  const canRun = (websiteUrl.trim().length > 0 || brandName.trim().length > 0) && !analysisMutation.isPending;

  const handleRun = async () => {
    setUrlError(null);
    setBrandError(null);
    let url = websiteUrl.trim();
    if (!url && brandName.trim()) {
      try {
        const res: any = await resolveMutation.mutateAsync(brandName.trim());
        url = res?.url ?? "";
      } catch {
        return;
      }
    }
    analysisMutation.mutate({
      websiteUrl: url || undefined,
      brandName: brandName.trim() || undefined,
    });
  };

  const handleBrandBlur = () => {
    const name = brandName.trim();
    if (name && !websiteUrl.trim() && !resolveMutation.isPending) {
      resolveMutation.mutate(name);
    }
  };

  const activeAnalysis = (selectedId ? selected.data?.analysis : latest.data?.analysis) as any;
  const hasHistory = (history.data?.history?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[11px] uppercase tracking-widest text-indigo-200">
          <Sparkles className="h-3 w-3" /> Website Intelligence
        </div>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
          Understand Your Website in Seconds
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Enter your website link or type your brand name and we will analyse everything for you.
        </p>

        {/* Inputs */}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Website Link</label>
            <Input
              value={websiteUrl}
              onChange={(e) => { setWebsiteUrl(e.target.value); setUrlError(null); setResolvedHint(null); }}
              placeholder="e.g. https://yourwebsite.com"
              className="mt-1.5 h-11"
            />
            {urlError && <div className="mt-1.5 text-xs text-rose-300">{urlError}</div>}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Brand Name</label>
            <div className="relative">
              <Input
                value={brandName}
                onChange={(e) => { setBrandName(e.target.value); setBrandError(null); }}
                onBlur={handleBrandBlur}
                placeholder="e.g. Creative IT, Your Company"
                className="mt-1.5 h-11 pr-10"
              />
              {resolveMutation.isPending && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {brandError && <div className="mt-1.5 text-xs text-rose-300">{brandError}</div>}
          </div>
        </div>

        {resolvedHint && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/5 px-3 py-2 text-xs text-indigo-100">
            <Search className="h-3.5 w-3.5" />
            <span>We found this website for you — does this look right?</span>
            <span className="font-mono text-indigo-200 truncate max-w-[40ch]">{resolvedHint}</span>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setResolvedHint(null)}>
                <Check className="h-3 w-3 mr-1" /> Looks good
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setWebsiteUrl(""); setResolvedHint(null); }}>
                <X className="h-3 w-3 mr-1" /> Change it
              </Button>
            </div>
          </div>
        )}

        <div className="mt-5">
          <Button
            onClick={handleRun}
            disabled={!canRun}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90"
          >
            {analysisMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analysing…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Run Analysis</>
            )}
          </Button>
        </div>
      </div>

      {/* History */}
      {hasHistory && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-indigo-300" />
            <div className="text-sm font-medium">Recent Analyses</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.data!.history.map((h: any) => (
              <div
                key={h.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-indigo-400/30 transition cursor-pointer"
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
                    <Button
                      size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                      onClick={(e) => { e.stopPropagation(); analysisMutation.mutate({ websiteUrl: h.url }); }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Re-run
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-rose-300 hover:text-rose-200"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await runRemove({ data: { id: h.id } });
                          toast.success("Removed");
                          if (selectedId === h.id) setSelectedId(null);
                          qc.invalidateQueries({ queryKey: ["website-analysis"] });
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Could not remove");
                        }
                      }}
                    >
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
      {analysisMutation.isPending && (
        <ProgressPanel idx={progressIdx} />
      )}

      {/* Empty state */}
      {!analysisMutation.isPending && !activeAnalysis && !hasHistory && (
        <EmptyState />
      )}

      {/* Results */}
      {!analysisMutation.isPending && activeAnalysis?.status === "completed" && (
        <Results
          analysis={activeAnalysis}
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
        <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
        Working on your analysis…
      </div>
      <Progress value={pct} className="mt-4" />
      <ul className="mt-4 space-y-2">
        {PROGRESS_STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 text-sm transition ${i <= idx ? "text-foreground" : "text-muted-foreground/50"}`}>
            {i < idx ? <Check className="h-4 w-4 text-emerald-400" /> :
              i === idx ? <Loader2 className="h-4 w-4 animate-spin text-indigo-300" /> :
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
      <Globe className="h-10 w-10 mx-auto text-indigo-300/70" />
      <h2 className="mt-4 text-xl md:text-2xl font-semibold">Analyse Any Website in Seconds</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
        Type your website link or brand name above and instantly see your brand colors, fonts, content summary, and SEO basics — all in one place.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto text-left">
        {EXAMPLE_CARDS.map((e) => (
          <div key={e.brand} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <img src={favicon(e.url)} alt="" className="h-6 w-6 rounded" />
              <div className="text-sm font-medium">{e.brand}</div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{domainOf(e.url)}</div>
            <p className="text-xs text-muted-foreground mt-2">{e.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Results({ analysis, onRerun }: { analysis: any; onRerun: () => void }) {
  const a = analysis;
  const branding = (a?.branding ?? {}) as any;
  const palette: Record<string, string> = branding?.colors ?? {};
  const fonts: Array<{ family?: string }> = branding?.fonts ?? [];
  const links: string[] = Array.isArray(a?.links) ? a.links : [];

  const grouped = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const l of links) {
      const d = domainOf(l);
      (g[d] ||= []).push(l);
    }
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

      {/* Page Information */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live homepage analysis
        </div>
        <h2 className="mt-2 text-lg font-semibold">{a.title ?? a.url}</h2>
        <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 hover:underline inline-flex items-center gap-1 mt-1">
          {a.url} <ExternalLink className="h-3 w-3" />
        </a>
        {a.description && (
          <p className="text-sm mt-3 text-foreground/90">{a.description}</p>
        )}
        <div className="mt-3 text-[11px] text-muted-foreground">
          Analyzed {a.analyzed_at ? new Date(a.analyzed_at).toLocaleString() : "—"}
        </div>
      </div>

      {/* AI Summary */}
      {a.summary && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-indigo-300" /> What Your Website Says About Your Business
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{a.summary}</p>
        </div>
      )}

      {/* Colors */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4 text-indigo-300" /> Brand Colors
        </div>
        {Object.keys(palette).length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">No palette detected.</div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-5">
            {Object.entries(palette).map(([k, v]) => (
              <div key={k} className="flex flex-col items-center w-24">
                <div
                  className="h-16 w-16 rounded-full border border-white/15 shadow-inner"
                  style={{ background: String(v) }}
                />
                <div className="mt-2 text-xs font-medium capitalize text-center">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Typography */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Type className="h-4 w-4 text-indigo-300" /> Typography
        </div>
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
      </div>

      {/* Outbound links */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LinkIcon className="h-4 w-4 text-indigo-300" /> Where Your Website Links To
          <span className="ml-auto text-[11px] text-muted-foreground">{links.length} links</span>
        </div>
        {grouped.length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">No outbound links found.</div>
        ) : (
          <div className="mt-4 space-y-4 max-h-80 overflow-auto pr-1">
            {grouped.map(([dom, urls]) => (
              <div key={dom}>
                <div className="text-xs font-medium text-foreground/90 flex items-center gap-2">
                  <img src={`https://www.google.com/s2/favicons?domain=${dom}&sz=32`} alt="" className="h-3.5 w-3.5" />
                  {dom}
                  <span className="text-[10px] text-muted-foreground">({urls.length})</span>
                </div>
                <ul className="mt-1.5 ml-5 space-y-0.5">
                  {urls.slice(0, 8).map((l) => (
                    <li key={l} className="text-[11px] text-muted-foreground truncate">
                      <a href={l} target="_blank" rel="noreferrer" className="hover:text-indigo-300">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
