import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Globe, BarChart3, Search, Facebook, Instagram, Linkedin, Youtube,
  MapPin, Music2, Twitter, Check, Loader2, AlertTriangle, Plug, ArrowRight,
  Sparkles, Building2, Target, Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getBrandDna, saveBrandIdentity, connectWebsite, disconnectSource,
} from "@/lib/connections.functions";
import { analyzeWebsite } from "@/lib/website-analysis.functions";

export const Route = createFileRoute("/dashboard/brand-dna-setup")({
  component: BrandDnaSetupPage,
});

const INDUSTRIES = [
  "Technology / SaaS","E-commerce / D2C","Retail","Fashion & Beauty","Food & Beverage",
  "Finance / Fintech","Healthcare","Education","Real Estate","Travel & Hospitality",
  "Media & Entertainment","Manufacturing","Agency / Consulting","Non-profit","Other",
];
const EMPLOYEE_SIZES = ["1–10","11–50","51–200","201–500","501–1,000","1,000+"];

type PlatformDef = {
  id: "website"|"google_analytics"|"google_search_console"|"facebook"|"instagram"|"tiktok"|"linkedin"|"youtube"|"google_business"|"twitter";
  name: string;
  blurb: string;
  icon: typeof Globe;
  accent: string;
  phase: "available" | "phase2" | "phase3" | "phase4" | "phase7";
};

const PLATFORMS: PlatformDef[] = [
  { id: "website", name: "Website", blurb: "Crawl your homepage for SEO, content & brand consistency.", icon: Globe, accent: "from-indigo-500 to-blue-500", phase: "available" },
  { id: "google_search_console", name: "Google Search Console", blurb: "Top keywords, impressions, clicks, CTR & rankings.", icon: Search, accent: "from-emerald-500 to-teal-500", phase: "phase3" },
  { id: "google_analytics", name: "Google Analytics 4", blurb: "Traffic, sessions, conversions and audience behavior.", icon: BarChart3, accent: "from-orange-500 to-amber-500", phase: "phase4" },
  { id: "google_business", name: "Google Business Profile", blurb: "Reviews, ratings, listing completeness & customer actions.", icon: MapPin, accent: "from-sky-500 to-cyan-500", phase: "phase7" },
  { id: "facebook", name: "Facebook Page", blurb: "Followers, reach, engagement & post performance.", icon: Facebook, accent: "from-blue-600 to-indigo-600", phase: "phase7" },
  { id: "instagram", name: "Instagram Business", blurb: "Reach, impressions, engagement rate & top posts.", icon: Instagram, accent: "from-pink-500 to-rose-500", phase: "phase7" },
  { id: "tiktok", name: "TikTok Business", blurb: "Views, engagement and audience analytics.", icon: Music2, accent: "from-fuchsia-500 to-pink-500", phase: "phase7" },
  { id: "linkedin", name: "LinkedIn Page", blurb: "Followers, post engagement & company updates.", icon: Linkedin, accent: "from-blue-500 to-sky-500", phase: "phase7" },
  { id: "youtube", name: "YouTube Channel", blurb: "Subscribers, watch time and video engagement.", icon: Youtube, accent: "from-red-500 to-rose-500", phase: "phase7" },
  { id: "twitter", name: "X / Twitter", blurb: "Followers, post reach & conversation analytics.", icon: Twitter, accent: "from-slate-400 to-slate-200", phase: "phase7" },
];

const PHASE_COPY: Record<string, string> = {
  phase2: "Lights up in Phase 2 (Website analysis).",
  phase3: "Lights up in Phase 3 (Search Console).",
  phase4: "Lights up in Phase 4 (Google Analytics).",
  phase7: "Available in Phase 7 — requires developer-app registration.",
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon?: any }> = {
    connected:           { label: "Connected",          cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: Check },
    connecting:          { label: "Connecting…",        cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",       icon: Loader2 },
    syncing:             { label: "Syncing…",           cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",             icon: Loader2 },
    permission_expired:  { label: "Permission expired", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",          icon: AlertTriangle },
    api_error:           { label: "API error",          cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",          icon: AlertTriangle },
    not_connected:       { label: "Not connected",      cls: "bg-white/5 text-muted-foreground border-white/10" },
  };
  const e = map[status] ?? map.not_connected;
  const Icon = e.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", e.cls)}>
      {Icon && <Icon className={cn("h-3 w-3", (status === "connecting" || status === "syncing") && "animate-spin")} />}
      {e.label}
    </span>
  );
}

function BrandDnaSetupPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const fetchDna = useServerFn(getBrandDna);
  const { data, isLoading } = useQuery({
    queryKey: ["brand-dna"],
    queryFn: () => fetchDna(),
    staleTime: 30_000,
  });

  // Step 1 form state — hydrate when data arrives
  const [form, setForm] = useState({
    brandName: "", industry: "", employeeSize: "",
    businessLocation: "", websiteUrl: "",
    brandGoal: "", targetAudience: "",
  });
  useEffect(() => {
    if (!data) return;
    setForm((f) => ({
      brandName: data.company?.name ?? f.brandName,
      industry: data.company?.industry ?? f.industry,
      employeeSize: data.company?.employee_size ?? f.employeeSize,
      businessLocation: data.identity?.business_location ?? f.businessLocation,
      websiteUrl: data.company?.website_url ?? f.websiteUrl,
      brandGoal: data.identity?.brand_goal ?? f.brandGoal,
      targetAudience: data.identity?.target_audience ?? f.targetAudience,
    }));
  }, [data]);

  const saveIdentity = useServerFn(saveBrandIdentity);
  const saveMutation = useMutation({
    mutationFn: (vars: typeof form) => saveIdentity({ data: vars }),
    onSuccess: () => {
      toast.success("Brand identity saved");
      qc.invalidateQueries({ queryKey: ["brand-dna"] });
      setStep(2);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const sourcesByPlatform = useMemo(() => {
    const map = new Map<string, any>();
    (data?.sources ?? []).forEach((s: any) => map.set(s.platform, s));
    return map;
  }, [data]);

  const connectedCount = useMemo(
    () => (data?.sources ?? []).filter((s: any) => s.status === "connected").length,
    [data],
  );
  const hasWebsite = sourcesByPlatform.get("website")?.status === "connected";
  const canEnterDashboard = hasWebsite && connectedCount >= 2;

  // Website connect dialog
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [websiteInput, setWebsiteInput] = useState("");
  useEffect(() => { setWebsiteInput(form.websiteUrl ?? ""); }, [form.websiteUrl, websiteOpen]);

  const connectSite = useServerFn(connectWebsite);
  const connectMutation = useMutation({
    mutationFn: (url: string) => connectSite({ data: { websiteUrl: url } }),
    onSuccess: () => {
      toast.success("Website connected");
      qc.invalidateQueries({ queryKey: ["brand-dna"] });
      setWebsiteOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not connect website"),
  });

  const disconnect = useServerFn(disconnectSource);
  const disconnectMutation = useMutation({
    mutationFn: (platform: string) => disconnect({ data: { platform: platform as any } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["brand-dna"] });
    },
  });

  const runAnalysis = useServerFn(analyzeWebsite);
  const analyzeMutation = useMutation({
    mutationFn: () => runAnalysis({ data: {} }),
    onSuccess: () => {
      toast.success("Website analyzed");
      qc.invalidateQueries({ queryKey: ["brand-dna"] });
      qc.invalidateQueries({ queryKey: ["website-analysis"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#070912] via-[#0a0d18] to-[#0a0d18] text-foreground">
      <Toaster theme="dark" position="bottom-right" />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[11px] uppercase tracking-widest text-indigo-200">
            <Sparkles className="h-3 w-3" /> Onboarding
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Connect Your Platforms
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Connect your real digital platforms so BrandSync AI can analyze your live brand ecosystem and generate real-time intelligence.
          </p>

          <div className="mt-6 text-xs text-muted-foreground">
            {connectedCount}/10 connected · Website {hasWebsite ? "✓" : "—"}
          </div>
        </header>

        {step === 2 && (

          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLATFORMS.map((p) => {
                const src = sourcesByPlatform.get(p.id);
                const status = src?.status ?? "not_connected";
                const isConnected = status === "connected";
                const lastSynced = src?.last_synced_at ? new Date(src.last_synced_at).toLocaleString() : "Never";
                const Icon = p.icon;
                const isAvailable = p.phase === "available";

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border bg-white/[0.03] p-5 transition",
                      isConnected ? "border-emerald-500/30" : "border-white/10 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br grid place-items-center shrink-0", p.accent)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-sm truncate">{p.name}</h3>
                          <StatusPill status={status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.blurb}</p>
                      </div>
                    </div>

                    <div className="mt-4 text-[11px] text-muted-foreground space-y-0.5">
                      <div>Last synced: <span className="text-foreground/80">{lastSynced}</span></div>
                      {src?.external_account_label && (
                        <div className="truncate">Account: <span className="text-foreground/80">{src.external_account_label}</span></div>
                      )}
                      {src?.last_error && <div className="text-rose-300 truncate">Error: {src.last_error}</div>}
                      {!isAvailable && <div className="text-amber-300/80">{PHASE_COPY[p.phase]}</div>}
                    </div>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {isConnected ? (
                        <>
                          {p.id === "website" ? (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => analyzeMutation.mutate()}
                              disabled={analyzeMutation.isPending}
                              className="text-[11px] h-8"
                            >
                              {analyzeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
                              {analyzeMutation.isPending ? "Analyzing…" : "Run analysis"}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled className="text-[11px] h-8">
                              Sync now
                            </Button>
                          )}
                          {p.id === "website" && (
                            <Link to="/dashboard/website-analysis" className="text-[11px] text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline">
                              View report
                            </Link>
                          )}
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => disconnectMutation.mutate(p.id)}
                            disabled={disconnectMutation.isPending}
                            className="text-[11px] text-muted-foreground hover:text-rose-300 ml-auto"
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : isAvailable && p.id === "website" ? (
                        <Button
                          size="sm"
                          onClick={() => setWebsiteOpen(true)}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-[11px] h-8"
                        >
                          <Plug className="h-3.5 w-3.5 mr-1.5" /> Connect
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="text-[11px] h-8">
                          Available soon
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">Ready for live intelligence?</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Connect at least your <strong>Website</strong> plus one more platform to unlock the full dashboard. Sections without a connection show "Connection Required" cards — never fake data.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button
                  onClick={() => navigate({ to: "/dashboard/intelligence" })}
                  disabled={!canEnterDashboard}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-11 px-6"
                >
                  {canEnterDashboard ? <>Enter dashboard <ArrowRight className="ml-2 h-4 w-4" /></> : "Connect 2+ to continue"}
                </Button>
              </div>
            </div>
          </motion.section>
        )}

        {isLoading && (
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading your workspace…
          </div>
        )}
      </div>

      <Dialog open={websiteOpen} onOpenChange={setWebsiteOpen}>
        <DialogContent className="sm:max-w-[460px] glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="h-4 w-4 text-indigo-400" /> Connect your website</DialogTitle>
            <DialogDescription>We'll crawl this URL to analyze SEO, content & brand messaging.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div>
              <Label>Website URL</Label>
              <Input value={websiteInput} onChange={(e) => setWebsiteInput(e.target.value)} placeholder="https://www.yourbrand.com" />
            </div>
            <Button
              onClick={() => connectMutation.mutate(websiteInput)}
              disabled={!websiteInput || connectMutation.isPending}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 h-11"
            >
              {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect website"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reusable status badge to top-bar / sidebar usage elsewhere if needed
export { StatusPill };
