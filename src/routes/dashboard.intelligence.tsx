import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Brain, Upload, Globe, Sparkles, Check, Target, Heart, MessageSquare, Compass, TrendingUp, AlertTriangle, Wand2, RefreshCw, Copy, Image as ImageIcon, ShieldCheck, FileText, BarChart3, Zap, Gauge, Globe2, Activity, Trophy, Swords, Plus, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PageHeader, GlassCard, StatCard, Pill } from "@/components/app/ui";
import { TrafficAnalyzer } from "@/components/app/TrafficAnalyzer";
import { AIPredictionsTab, AudienceDNATab, KeywordIntelligenceTab, BehavioralAnalyticsTab, CrisisRadarTab, RevenueAttributionTab } from "@/components/app/IntelligenceTabs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { competitors } from "@/lib/mock";

export const Route = createFileRoute("/dashboard/intelligence")({
  component: Intelligence,
  head: () => ({ meta: [{ title: "Brand Intelligence — BrandSync AI" }] }),
});

type BrandProfile = {
  name: string;
  website: string;
  logo: string | null; // data URL or SVG string
  logoKind: "upload" | "ai" | "none";
  trainedAt: string | null;
  companyIndex: string; // unique copyright/patent index
};

const DEFAULT_BRAND: BrandProfile = {
  name: "Acme",
  website: "https://acme.io",
  logo: null,
  logoKind: "none",
  trainedAt: "2026-04-22",
  companyIndex: "BSX-AC-001928",
};

function Intelligence() {
  const [brand, setBrand] = useState<BrandProfile>(DEFAULT_BRAND);

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence Layer"
        title="Brand Intelligence"
        subtitle="The AI's permanent memory of your brand — voice, archetype, sentiment, vocabulary, and strategic positioning."
        actions={<SetupWizard brand={brand} onComplete={setBrand} />}
      />

      <BrandIdentityBanner brand={brand} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <BrandHealthScoreCard score={92} delta="+4 vs last mo" />
        <StatCard label="Traffic Momentum" value="96%" delta="+2%" accent="indigo" />
        <StatCard label="Stickiness Rate" value="+0.71" delta="+0.08" accent="purple" />
      </div>

      <Tabs defaultValue="traffic" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
          <TabsTrigger value="traffic"><BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Traffic Analyzer</TabsTrigger>
          <TabsTrigger value="keywords"><Target className="h-3.5 w-3.5 mr-1.5" /> Keyword Intelligence</TabsTrigger>
        </TabsList>

        <USPStrip />

        <TabsContent value="traffic" className="mt-5">
          <TrafficAnalyzer domain={brand.website} />
        </TabsContent>

        <TabsContent value="keywords" className="mt-5"><KeywordIntelligenceTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function LogoMark({ brand, size = 40 }: { brand: BrandProfile; size?: number }) {
  if (brand.logo) {
    return (
      <img
        src={brand.logo}
        alt={`${brand.name} logo`}
        style={{ width: size, height: size }}
        className="rounded-xl object-cover bg-white/5 border border-white/10"
      />
    );
  }
  const initials = brand.name.split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase() || "B";
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-500 flex items-center justify-center font-semibold text-white shadow-lg"
    >
      {initials}
    </div>
  );
}

function BrandIdentityBanner({ brand }: { brand: BrandProfile }) {
  return (
    <GlassCard className="mb-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <LogoMark brand={brand} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-semibold truncate">{brand.name}</div>
            <Pill tone="indigo">Index · {brand.companyIndex}</Pill>
            {brand.trainedAt && <Pill tone="emerald">Trained {brand.trainedAt}</Pill>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3 w-3 flex-none" />
            <a
              href={/^https?:\/\//i.test(brand.website) ? brand.website : `https://${brand.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-indigo-300 hover:underline underline-offset-2 transition-colors"
              title={brand.website}
            >
              {brand.website}
            </a>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-300/80 max-w-[260px] text-right">
          <ShieldCheck className="h-3.5 w-3.5 flex-none" />
          <span>Generated insights, data &amp; creative © {brand.name}. Copyright &amp; patent rights retained by the company.</span>
        </div>
      </div>
    </GlassCard>
  );
}

function SetupWizard({ brand, onComplete }: { brand: BrandProfile; onComplete: (b: BrandProfile) => void }) {
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(brand.name);
  const [website, setWebsite] = useState(brand.website);
  const [logo, setLogo] = useState<string | null>(brand.logo);
  const [logoKind, setLogoKind] = useState<BrandProfile["logoKind"]>(brand.logoKind);
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);

  const totalSteps = 4;

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      setLogoKind("upload");
    };
    reader.readAsDataURL(file);
  }

  function aiGenerateLogo() {
    setGeneratingLogo(true);
    setTimeout(() => {
      const initials = (name || "B").split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
      const hueA = Math.floor(Math.random() * 360);
      const hueB = (hueA + 60) % 360;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hueA},85%,60%)"/><stop offset="1" stop-color="hsl(${hueB},85%,55%)"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><circle cx="64" cy="64" r="34" fill="none" stroke="white" stroke-opacity="0.35" stroke-width="2"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="48" font-weight="700" fill="white">${initials}</text></svg>`;
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      setLogo(dataUrl);
      setLogoKind("ai");
      setGeneratingLogo(false);
    }, 1200);
  }

  function finish() {
    const idx = "BSX-" + (name || "BR").replace(/\s+/g, "").slice(0,2).toUpperCase() + "-" + Math.floor(100000 + Math.random()*899999);
    onComplete({
      name: name || "Untitled Brand",
      website: website || "https://example.com",
      logo,
      logoKind,
      trainedAt: new Date().toISOString().slice(0,10),
      companyIndex: idx,
    });
    setOpen(false);
    setStep(1);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setStep(1); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 glow-primary">
          <Brain className="h-4 w-4 mr-2" /> Re-train Brand AI
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d1120] border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-400" /> Brand Setup Wizard</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <div key={n} className={`flex-1 h-1 rounded-full ${step >= n ? "bg-gradient-to-r from-indigo-500 to-purple-600" : "bg-white/10"}`} />
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
          {step === 1 && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Step 1 · Connect your digital footprint</div>
              <Input placeholder="Brand / company name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" />
              <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="https://yourbrand.com" value={website} onChange={(e) => setWebsite(e.target.value)} className="pl-9 bg-white/5 border-white/10" /></div>
              <Input placeholder="Instagram handle" defaultValue="@acme.official" className="bg-white/5 border-white/10" />
              <Input placeholder="LinkedIn / X / TikTok" defaultValue="linkedin.com/company/acme" className="bg-white/5 border-white/10" />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Step 2 · Attach or generate your logo</div>
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <LogoMark brand={{ ...brand, name, logo, logoKind }} size={64} />
                <div className="flex-1 text-xs text-muted-foreground">
                  {logo ? (logoKind === "ai" ? "AI-generated logo ready. You can regenerate or replace." : "Custom logo attached.") : "No logo yet — upload your own or let AI generate one based on your brand name."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-xl border-2 border-dashed border-white/15 p-4 text-center bg-white/[0.02] hover:border-indigo-400/50 transition">
                  <Upload className="h-5 w-5 mx-auto text-indigo-400" />
                  <div className="mt-1.5 text-xs font-medium">Upload logo</div>
                  <div className="text-[10px] text-muted-foreground">PNG, SVG, JPG</div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <button
                  type="button"
                  onClick={aiGenerateLogo}
                  disabled={generatingLogo}
                  className="rounded-xl border border-white/10 p-4 text-center bg-gradient-to-br from-indigo-500/10 to-purple-600/10 hover:from-indigo-500/20 hover:to-purple-600/20 transition disabled:opacity-60"
                >
                  {generatingLogo ? (
                    <RefreshCw className="h-5 w-5 mx-auto text-purple-300 animate-spin" />
                  ) : (
                    <Wand2 className="h-5 w-5 mx-auto text-purple-300" />
                  )}
                  <div className="mt-1.5 text-xs font-medium">{generatingLogo ? "Generating…" : "Generate with AI"}</div>
                  <div className="text-[10px] text-muted-foreground">From brand name & vibe</div>
                </button>
              </div>
              {logo && (
                <button type="button" onClick={() => { setLogo(null); setLogoKind("none"); }} className="text-[11px] text-muted-foreground hover:text-foreground underline">
                  Remove logo
                </button>
              )}
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="text-sm text-muted-foreground mb-3">Step 3 · Upload brand PDF &amp; supporting assets</div>
              <label className="cursor-pointer block rounded-xl border-2 border-dashed border-white/15 p-8 text-center bg-white/[0.02] hover:border-indigo-400/50 transition">
                <Upload className="h-6 w-6 mx-auto text-indigo-400" />
                <div className="mt-2 text-sm">Drop brand guidelines PDF, ads, videos, decks</div>
                <div className="text-xs text-muted-foreground">PDF, MP4, PNG · up to 500MB</div>
                <input type="file" accept=".pdf,.mp4,.png,.jpg,.zip" className="hidden" onChange={() => setPdfUploaded(true)} />
              </label>
              <div className="mt-3 space-y-1.5 text-xs">
                {[
                  { f: `${(name || "brand").toLowerCase().replace(/\s+/g,"-")}-brand-guidelines.pdf`, icon: FileText },
                  { f: "spring-campaign-reel.mp4", icon: ImageIcon },
                  { f: "press-kit-2025.zip", icon: FileText },
                ].map(({f, icon: Icon}) => (
                  <div key={f} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-indigo-300" />{f}</span>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                ))}
                {pdfUploaded && (
                  <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                    <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-emerald-300" />your-uploaded-file.pdf</span>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="rounded-xl bg-black/40 border border-white/10 p-4 font-mono text-xs text-emerald-300/90 space-y-1 h-56 overflow-hidden relative">
              <div className="shimmer absolute inset-0" />
              <div>$ brandsync.train --workspace {(name || "brand").toLowerCase().replace(/\s+/g,"-")}</div>
              <div>› Indexing logo &amp; visual identity… <span className="text-emerald-400">done</span></div>
              <div>› Crawling {website}…  <span className="text-emerald-400">412 pages</span></div>
              <div>› Parsing brand PDF &amp; assets…</div>
              <div>› Extracting palette: oklch(0.65 0.22 280) +6 …</div>
              <div>› Mapping vocabulary: 8,142 tokens</div>
              <div>› Modeling sentiment across 18 channels…</div>
              <div>› Detecting archetype: <span className="text-purple-300">Visionary Magician</span></div>
              <div>› Sealing company index &amp; copyright manifest…</div>
              <div className="text-indigo-300">› Brand AI ready ✨ Dashboard regenerating with your data.</div>
            </div>
          )}
        </motion.div>

        <div className="flex justify-between mt-5">
          <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1}>Back</Button>
          <Button onClick={() => step < totalSteps ? setStep(s => s+1) : finish()} className="bg-gradient-to-r from-indigo-500 to-purple-600">
            {step < totalSteps ? "Continue" : "Finish & generate dashboard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImprovementAreas() {
  const areas = [
    {
      title: "Lift Playfulness on Reels & TikTok",
      severity: "Medium",
      tone: "indigo" as const,
      impact: "+18% engagement projected",
      desc: "Your short-form content reads 24% more formal than top-quartile peers in your category. Inject witty hooks and meme-fluent language for Gen-Z audiences.",
      actions: ["Test 5 playful hook variants", "Adopt 'Magician' archetype voice on Reels"],
    },
    {
      title: "Tighten Visual Consistency",
      severity: "High",
      tone: "rose" as const,
      impact: "Recall +12pts",
      desc: "Across 412 audited assets, 31% deviate from your primary palette. Logo lockup safe-zones are violated on 14% of paid creatives.",
      actions: ["Lock palette tokens in Creative Studio", "Auto-reject off-brand exports"],
    },
    {
      title: "Expand Thought Leadership on LinkedIn",
      severity: "Opportunity",
      tone: "emerald" as const,
      impact: "SOV +6.4%",
      desc: "Competitor B publishes 3.2x more long-form essays. Your authority score is high but underutilized — a publishing cadence shift compounds quickly.",
      actions: ["Ship 3 essays / month", "Activate exec-led commenting"],
    },
    {
      title: "Reduce Jargon in Onboarding Copy",
      severity: "Medium",
      tone: "purple" as const,
      impact: "Activation +9%",
      desc: "Reading-level analysis flags onboarding at grade 14. Your audience persona reads best at grade 9-10. Simpler language improves trial-to-paid.",
      actions: ["Rewrite 7 onboarding screens", "A/B test simplified CTAs"],
    },
  ];

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-indigo-300"><TrendingUp className="h-4 w-4" /> AI-Recommended Improvement Areas</div>
          <div className="text-xs text-muted-foreground">Prioritized opportunities to strengthen your brand strategy — refreshed nightly.</div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-analyze</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((a) => (
          <GlassCard key={a.title} className="relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${a.tone === "rose" ? "text-rose-300" : a.tone === "emerald" ? "text-emerald-300" : a.tone === "purple" ? "text-purple-300" : "text-indigo-300"}`} />
                <div className="text-sm font-semibold">{a.title}</div>
              </div>
              <Pill tone={a.tone}>{a.severity}</Pill>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{a.desc}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300"><Sparkles className="h-3 w-3" /> {a.impact}</div>
            <div className="mt-3 space-y-1.5">
              {a.actions.map((act) => (
                <div key={act} className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span className="text-foreground/80">{act}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 h-7 text-xs"><Wand2 className="h-3 w-3 mr-1.5" /> Apply suggestion</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs">Dismiss</Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

const VOICE_AXES = [
  { key: "Formality", value: 35, low: "Casual", high: "Formal" },
  { key: "Warmth", value: 78, low: "Detached", high: "Warm" },
  { key: "Authority", value: 82, low: "Humble", high: "Authoritative" },
  { key: "Playfulness", value: 54, low: "Serious", high: "Playful" },
];

const VOICE_SAMPLES: Record<string, string> = {
  base: "Meet BrandSync — the unified marketing OS that quietly orchestrates every campaign, asset, and audience signal so your team can focus on what matters.",
  playful: "Say hi to BrandSync ✨ the marketing OS that does the messy bits — campaigns, assets, audience signals — while you sip your coffee and look like a genius.",
  authoritative: "BrandSync is the definitive marketing operating system. It unifies campaigns, assets, and audience intelligence into a single command surface — engineered for teams that lead categories.",
  warm: "We built BrandSync for marketers who care deeply about their craft. It handles the heavy lifting — campaigns, assets, audience signals — so you have more room to do work you're proud of.",
};

function BrandVoiceStudio() {
  const [axes, setAxes] = useState(VOICE_AXES.map(a => a.value));
  const [prompt, setPrompt] = useState("Announce our Q1 product launch to enterprise marketers.");
  const [output, setOutput] = useState(VOICE_SAMPLES.base);
  const [loading, setLoading] = useState(false);

  function generate() {
    setLoading(true);
    setOutput("");
    setTimeout(() => {
      const [, , authority, playfulness] = axes;
      const key = playfulness > 70 ? "playful" : authority > 85 ? "authoritative" : axes[1] > 80 ? "warm" : "base";
      setOutput(VOICE_SAMPLES[key]);
      setLoading(false);
    }, 1100);
  }

  const insights = [
    { label: "Sounds 12% more confident than category average", tone: "emerald" as const },
    { label: "Reduce hedging words ('maybe', 'might') by ~30%", tone: "indigo" as const },
    { label: "Add 1 sensory verb per paragraph for vividness", tone: "purple" as const },
  ];

  return (
    <GlassCard className="lg:col-span-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-indigo-300"><MessageSquare className="h-4 w-4" /> Brand Voice Studio</div>
        <Pill tone="purple"><Sparkles className="h-3 w-3" /> AI-tuned</Pill>
      </div>

      <div className="mt-4 space-y-3">
        {VOICE_AXES.map((a, i) => (
          <div key={a.key}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{a.key}</span>
              <span className="text-foreground/80">{axes[i]}% · {axes[i] > 50 ? a.high : a.low}</span>
            </div>
            <Slider
              value={[axes[i]]}
              onValueChange={(v) => setAxes(prev => prev.map((p, idx) => idx === i ? v[0] : p))}
              max={100}
              step={1}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="text-[11px] uppercase tracking-widest text-indigo-300/80 mb-2">Try your voice</div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what to write…"
          className="bg-black/30 border-white/10 text-xs min-h-[60px]"
        />
        <Button onClick={generate} size="sm" className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-purple-600 glow-primary">
          <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate in this voice
        </Button>

        <div className="mt-3">
          {loading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-[92%] bg-white/5" />
              <Skeleton className="h-3 w-[78%] bg-white/5" />
            </div>
          ) : (
            <div className="relative rounded-md bg-black/30 border border-white/10 p-3 text-xs text-foreground/90 leading-relaxed">
              {output}
              <button onClick={() => navigator.clipboard?.writeText(output)} className="absolute top-2 right-2 opacity-60 hover:opacity-100">
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-widest text-indigo-300/80 mb-2">AI insights to refine</div>
        <div className="space-y-1.5">
          {insights.map((ins) => (
            <div key={ins.label} className="flex items-start gap-2 text-xs">
              <Sparkles className={`h-3 w-3 mt-0.5 ${ins.tone === "emerald" ? "text-emerald-300" : ins.tone === "purple" ? "text-purple-300" : "text-indigo-300"}`} />
              <span className="text-foreground/80">{ins.label}</span>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2 text-xs w-full justify-start"><RefreshCw className="h-3 w-3 mr-1.5" /> Apply AI refinements to voice profile</Button>
      </div>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Brand Health Score (enlarged with circular ring + breakdown)
// ─────────────────────────────────────────────────────────────
function BrandHealthScoreCard({ score, delta }: { score: number; delta: string }) {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1500;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDrawn(Math.round(score * (0.5 - Math.cos(Math.PI * p) / 2)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (drawn / 100) * circ;

  const breakdown = [
    { label: "Voice Consistency", value: 96, color: "oklch(0.65 0.22 280)" },
    { label: "Sentiment", value: 86, color: "oklch(0.68 0.2 320)" },
    { label: "Traffic Trend", value: 82, color: "oklch(0.72 0.18 155)" },
    { label: "Brand Recall", value: 78, color: "oklch(0.78 0.17 75)" },
  ];

  return (
    <div className="glass rounded-xl p-5 lg:col-span-2 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10" />
      <div className="relative flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="bhsRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.22 280)" />
                <stop offset="100%" stopColor="oklch(0.68 0.2 320)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="7" fill="none" />
            <circle
              cx="50" cy="50" r={r}
              stroke="url(#bhsRing)"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-semibold leading-none">{drawn}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">/ 100</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">Brand Health Score</div>
          <div className="text-[11px] text-emerald-300 mt-0.5">{delta}</div>
          <div className="mt-3 space-y-1.5">
            {breakdown.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[10.5px]">
                  <span className="flex items-center gap-1.5 text-foreground/80">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} />
                    {b.label}
                  </span>
                  <span className="text-foreground/60">{b.value}%</span>
                </div>
                <div className="mt-0.5 h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${b.value}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full rounded-full" style={{ background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// USP Strip (horizontally scrollable, shown across all tabs)
// ─────────────────────────────────────────────────────────────
function USPStrip() {
  const usps = [
    { icon: Zap, label: "Zero-setup GA4 Bridge", tone: "text-indigo-300" },
    { icon: Sparkles, label: "AI Predictive Analytics", tone: "text-purple-300" },
    { icon: Globe2, label: "Global + BD Market Data", tone: "text-emerald-300" },
    { icon: Activity, label: "Real-time Refresh", tone: "text-indigo-300" },
    { icon: Gauge, label: "Brand Health Score", tone: "text-purple-300" },
  ];
  return (
    <div className="mt-4 -mx-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-1 min-w-max">
        {usps.map((u) => (
          <div key={u.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] hover:border-indigo-400/40 hover:bg-white/[0.06] transition">
            <u.icon className={cn("h-3.5 w-3.5", u.tone)} />
            <span className="text-foreground/80 whitespace-nowrap">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Competitors Tab — cards + head-to-head + market position map
// ─────────────────────────────────────────────────────────────
type Competitor = {
  name: string; url: string; industry: string;
  visits: number; rank: number; da: number; overlap: number;
};

const COMPETITOR_SEED: Competitor[] = [
  { name: "HubSpot Marketing Hub", url: "hubspot.com",   industry: "Marketing OS",   visits: 21_400_000, rank:    412, da: 93, overlap: 78 },
  { name: "Mailchimp",             url: "mailchimp.com", industry: "Email & CRM",    visits: 18_900_000, rank:    687, da: 92, overlap: 64 },
  { name: "Sprout Social",         url: "sproutsocial.com", industry: "Social Suite", visits:  3_240_000, rank:  4_120, da: 86, overlap: 71 },
  { name: "Hootsuite",             url: "hootsuite.com", industry: "Social Suite",   visits:  6_780_000, rank:  2_310, da: 90, overlap: 66 },
  { name: "Semrush",               url: "semrush.com",   industry: "SEO Intelligence", visits: 41_200_000, rank:    198, da: 94, overlap: 52 },
  { name: "Buffer",                url: "buffer.com",    industry: "Social Scheduling", visits:  4_120_000, rank:  3_540, da: 88, overlap: 58 },
];

function fmtN(n: number) {
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(0) + "K" : String(n);
}

function CompetitorsTab({ brandName }: { brandName: string }) {
  const [list, setList] = useState<Competitor[]>(COMPETITOR_SEED);
  const [open, setOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>(COMPETITOR_SEED[0].name);
  const [tracked, setTracked] = useState<Record<string, boolean>>({});

  const you = { name: brandName || "Your Site", visits: 1_240_000, rank: 8_420, da: 71, overlap: 100, kw: 4_120, social: 84_000, bounce: 42.1, dur: "2m 38s" };
  const cmp = list.find(c => c.name === selected) || list[0];
  const cmpFull = { ...cmp, kw: Math.round(cmp.visits / 5000), social: Math.round(cmp.visits / 220), bounce: 38 + (cmp.overlap % 10), dur: "3m 12s" };

  function addCompetitor() {
    if (!newUrl) return;
    setLoading(true);
    setTimeout(() => {
      const clean = newUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      const seed = clean.length * 7919;
      setList(prev => [...prev, {
        name: newName || clean,
        url: clean,
        industry: "Custom",
        visits: 500_000 + (seed % 8_000_000),
        rank: 1_000 + (seed % 15_000),
        da: 60 + (seed % 30),
        overlap: 40 + (seed % 50),
      }]);
      setLoading(false);
      setNewUrl("");
      setNewName("");
      setOpen(false);
    }, 900);
  }

  const scatterData = list.map((c) => ({ x: c.visits / 1_000_000, y: c.da, z: 60, name: c.name }));
  const youPoint = [{ x: you.visits / 1_000_000, y: you.da, z: 180, name: you.name }];

  const h2hRows: { label: string; mine: string | number; theirs: string | number; mineBetter: boolean }[] = [
    { label: "Monthly Traffic",   mine: fmtN(you.visits), theirs: fmtN(cmpFull.visits), mineBetter: you.visits > cmpFull.visits },
    { label: "Bounce Rate",       mine: `${you.bounce}%`, theirs: `${cmpFull.bounce}%`, mineBetter: you.bounce < cmpFull.bounce },
    { label: "Avg Duration",      mine: you.dur, theirs: cmpFull.dur, mineBetter: false },
    { label: "Domain Authority",  mine: you.da, theirs: cmpFull.da, mineBetter: you.da > cmpFull.da },
    { label: "Organic Keywords",  mine: fmtN(you.kw), theirs: fmtN(cmpFull.kw), mineBetter: you.kw > cmpFull.kw },
    { label: "Social Followers",  mine: fmtN(you.social), theirs: fmtN(cmpFull.social), mineBetter: you.social > cmpFull.social },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-base font-semibold">Competitive Intelligence</div>
          <div className="text-xs text-muted-foreground">AI-mapped competitors based on your industry, keywords, and audience overlap.</div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-indigo-400/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Competitor</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0d1120] border-white/10 max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Swords className="h-4 w-4 text-indigo-300" /> Add Competitor</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Website URL (e.g. competitor.com)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-white/5 border-white/10" />
                <Input placeholder="Competitor name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-white/5 border-white/10" />
                <Button onClick={addCompetitor} disabled={loading || !newUrl} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
                  {loading ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyzing…</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Analyze Competitor</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Analysis</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map((c, idx) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group glass rounded-xl p-4 border border-white/10 hover:border-indigo-400/40 hover:bg-white/[0.04] transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500/40 to-purple-600/30 flex items-center justify-center text-xs font-semibold uppercase">{c.name[0]}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{c.name}</div>
                  <a href={`https://${c.url}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-300 hover:underline inline-flex items-center gap-1">
                    {c.url} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
              <Pill tone="neutral">{c.industry}</Pill>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Mini label="Est. Monthly Visits" value={fmtN(c.visits)} />
              <Mini label="Global Rank" value={`#${c.rank.toLocaleString()}`} />
              <Mini label="Domain Authority" value={`${c.da}`} />
              <div className="rounded-md bg-white/[0.03] border border-white/5 p-2">
                <div className="text-[10px] text-muted-foreground">Overlap Score</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.overlap}%`, background: c.overlap > 65 ? "oklch(0.72 0.18 155)" : c.overlap > 45 ? "oklch(0.78 0.17 75)" : "oklch(0.65 0.22 280)" }} />
                  </div>
                  <span className="text-[11px] text-foreground/80">{c.overlap}%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Button size="sm" variant="outline" className="h-7 text-[11px] border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20">View Full Analysis <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              <button
                onClick={() => setTracked(p => ({ ...p, [c.name]: !p[c.name] }))}
                className={cn("text-[11px] rounded-full px-2.5 py-1 border transition", tracked[c.name] ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground")}
              >
                {tracked[c.name] ? "✓ Tracking" : "Track"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="text-sm font-medium flex items-center gap-2"><Swords className="h-4 w-4 text-indigo-300" /> Head-to-Head Comparison</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{you.name}</span>
              <span className="text-muted-foreground">vs</span>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-[180px] h-8 bg-white/5 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{list.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/5">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.03] text-muted-foreground">
                <tr><th className="text-left p-2 font-medium">Metric</th><th className="text-right p-2 font-medium">{you.name}</th><th className="text-right p-2 font-medium">{cmp.name}</th></tr>
              </thead>
              <tbody>
                {h2hRows.map((r) => (
                  <tr key={r.label} className={cn("border-t border-white/5", r.mineBetter ? "bg-emerald-500/5" : "bg-rose-500/5")}>
                    <td className="p-2 text-muted-foreground">{r.label}</td>
                    <td className={cn("p-2 text-right font-medium", r.mineBetter ? "text-emerald-300" : "text-foreground/80")}>{r.mine}</td>
                    <td className={cn("p-2 text-right font-medium", !r.mineBetter ? "text-rose-300" : "text-foreground/80")}>{r.theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="h-[360px]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium flex items-center gap-2"><Trophy className="h-4 w-4 text-purple-300" /> Brand Posture vs Competitors</div>
            <Pill tone="indigo">Radar</Pill>
          </div>
          <ResponsiveContainer width="100%" height="88%">
            <RadarChart data={competitors}>
              <PolarGrid stroke="oklch(1 0 0 / 0.1)" />
              <PolarAngleAxis dataKey="metric" stroke="oklch(0.7 0.02 260)" tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 11 }} />
              <PolarRadiusAxis stroke="transparent" tick={false} />
              <Radar dataKey="us" stroke="oklch(0.65 0.22 280)" fill="oklch(0.65 0.22 280)" fillOpacity={0.4} />
              <Radar dataKey="A"  stroke="oklch(0.72 0.18 155)" fill="oklch(0.72 0.18 155)" fillOpacity={0.1} />
              <Radar dataKey="B"  stroke="oklch(0.78 0.17 75)"  fill="oklch(0.78 0.17 75)" fillOpacity={0.1} />
              <Radar dataKey="C"  stroke="oklch(0.65 0.25 20)"  fill="oklch(0.65 0.25 20)" fillOpacity={0.1} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard className="h-[400px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-emerald-300" /> Market Position Map</div>
            <div className="text-xs text-muted-foreground">Traffic Volume (M) × Domain Authority — leaders sit top-right</div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="purple">You</Pill>
            <Pill tone="neutral">Competitors</Pill>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="88%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
            <CartesianGrid stroke="oklch(1 0 0 / 0.06)" />
            <XAxis type="number" dataKey="x" name="Traffic (M)" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} label={{ value: "Traffic (M)", position: "insideBottom", offset: -5, fill: "oklch(0.6 0.02 260)", fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name="DA" stroke="oklch(0.7 0.02 260)" tick={{ fontSize: 11 }} domain={[40, 100]} label={{ value: "Domain Authority", angle: -90, position: "insideLeft", fill: "oklch(0.6 0.02 260)", fontSize: 10 }} />
            <ZAxis type="number" dataKey="z" range={[60, 220]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v: number, n: string) => [n === "x" ? `${v.toFixed(1)}M` : v, n === "x" ? "Traffic" : "DA"]} labelFormatter={() => ""} />
            <ReferenceArea x1={10} y1={80} fill="oklch(0.65 0.22 280 / 0.05)" />
            <Scatter data={scatterData} fill="oklch(0.72 0.18 155)" />
            <Scatter data={youPoint} fill="oklch(0.65 0.22 280)" shape="star" />
          </ScatterChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/5 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
