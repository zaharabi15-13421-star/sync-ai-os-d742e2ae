import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, Megaphone, Users, Contact, Star, Shield, BarChart3,
  Layers, Atom, ArrowRight, Check, Zap, TrendingDown, X, Lock, LayoutDashboard, LogOut
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { AuthTab } from "@/types/auth";

export const Route = createFileRoute("/")({
  component: Landing,
});

const MODULES = [
  { icon: Brain, title: "Brand Intelligence", desc: "Permanent AI memory of your voice, archetype & guidelines.", span: "md:col-span-2 md:row-span-2", accent: "indigo" },
  { icon: Sparkles, title: "Creative Engine", desc: "Multi-platform content production studio.", accent: "purple" },
  { icon: Megaphone, title: "Campaign Automation", desc: "Cross-channel deployment with auto-pilot.", accent: "indigo" },
  { icon: Users, title: "Audience Intelligence", desc: "Predictive segments. Geo hot-spots.", accent: "emerald" },
  { icon: Contact, title: "Lead & CRM", desc: "Unified inbox. AI lead scoring.", span: "md:col-span-2", accent: "indigo" },
  { icon: Star, title: "Influencer OS", desc: "Vet creators. Catch fake followers.", accent: "purple" },
  { icon: Shield, title: "Reputation Radar", desc: "Crisis alerts & social listening.", accent: "rose" },
  { icon: BarChart3, title: "Unified Analytics", desc: "Revenue attribution + AI forecast.", accent: "emerald" },
  { icon: Atom, title: "Simulation Engine", desc: "Predict ROI before you spend a cent.", accent: "purple" },
  { icon: Layers, title: "Collaboration", desc: "Approvals, calendar, asset library.", accent: "indigo" },
];

const INTEGRATIONS = ["Meta", "Google Ads", "TikTok", "LinkedIn", "WhatsApp", "Instagram", "YouTube", "Shopify", "HubSpot", "Stripe", "Mailchimp", "Salesforce", "Notion", "Slack", "Pinterest", "Snapchat"];

const REPLACED_TOOLS = [
  { name: "HubSpot", cost: 800 },
  { name: "Hootsuite", cost: 249 },
  { name: "Canva Teams", cost: 120 },
  { name: "Jasper AI", cost: 99 },
  { name: "Brandwatch", cost: 600 },
  { name: "Mailchimp", cost: 220 },
  { name: "Sprout Social", cost: 299 },
  { name: "AdEspresso", cost: 199 },
  { name: "Brand24", cost: 149 },
  { name: "Klaviyo", cost: 350 },
  { name: "Lookr Influencer", cost: 280 },
  { name: "Hotjar", cost: 99 },
];

const TIERS = [
  { name: "Starter", price: 99, blurb: "For SMEs getting started", features: ["3 social channels", "5K AI credits / mo", "1 brand workspace", "Basic analytics", "Email support"], accent: "from-slate-700 to-slate-900" },
  { name: "Growth", price: 599, popular: true, blurb: "For mid-market growth teams", features: ["All channels + WhatsApp", "75K AI credits / mo", "Multi-language (BD + USA)", "Campaign Automation", "Predictive simulation", "Priority support"], accent: "from-indigo-500 to-purple-600" },
  { name: "Enterprise", price: 4900, blurb: "For agencies & global brands", features: ["Unlimited everything", "White-label dashboard", "Multi-brand management", "API access + SSO", "Dedicated CSM", "SLA & DPA"], accent: "from-purple-600 to-fuchsia-600" },
];

function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      <Nav onOpenDemo={() => setDemoOpen(true)} />
      <Hero onOpenDemo={() => setDemoOpen(true)} />
      <Marquee />
      <Bento />
      <ReplacementCalculator />
      <Pricing />
      <CTA />
      <Footer />
      <AuthModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

function Nav({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[color:var(--app-bg)]/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center glow-primary">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">BrandSync <span className="text-indigo-400">AI</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Platform</a>
          <a href="#calc" className="hover:text-foreground">Replace Stack</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 h-9 text-sm font-medium glow-primary hover:scale-[1.02] transition"
          >
            <Sparkles className="h-3.5 w-3.5" /> Register
          </button>
          <Link to="/dashboard/intelligence" className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 h-9 text-sm hover:bg-white/10">
            Dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative">
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          v3.0 — Now with Predictive Simulation Engine
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight"
        >
          <span className="text-gradient">BrandSync AI</span>
          <div className="text-foreground/90 mt-2 text-3xl md:text-5xl">
            Integrated Marketing & Intelligence OS
          </div>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          One AI platform replacing your entire MarTech stack — branding, creative, campaigns,
          CRM, influencers, listening, analytics. <span className="text-foreground">10–15 tools. One unified OS.</span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/dashboard/intelligence" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 h-12 font-medium glow-primary hover:scale-[1.02] transition">
            Enter Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={onOpenDemo} className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-5 h-12 font-medium hover:bg-white/10">
            <Sparkles className="h-4 w-4" /> Register
          </button>
        </motion.div>

        {/* Floating product mock */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="relative mt-20 mx-auto max-w-5xl"
        >
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-2 glow-primary">
            <div className="rounded-xl bg-[#0a0d16]/80 backdrop-blur-md p-6 grid grid-cols-12 gap-4 min-h-[340px]">
              <div className="col-span-4 glass rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Predicted ROAS</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">4.82×</div>
                <div className="mt-3 h-16 flex items-end gap-1">
                  {[40, 55, 48, 70, 82, 76, 95].map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500/40 to-purple-400" style={{ height: `${v}%` }} />
                  ))}
                </div>
              </div>
              <div className="col-span-5 glass rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-indigo-300"><Sparkles className="h-3.5 w-3.5" /> AI Recommendation</div>
                <div className="mt-2 text-sm">Shift 22% of Meta budget to TikTok creators in the 18–24 segment. Projected lift:</div>
                <div className="mt-2 flex items-baseline gap-2"><span className="text-2xl font-semibold text-emerald-300">+38%</span><span className="text-xs text-muted-foreground">CTR · 14d</span></div>
                <div className="mt-3 inline-flex items-center gap-2 text-xs rounded-md bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-2 py-1">Auto-pilot ON</div>
              </div>
              <div className="col-span-3 glass rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sentiment</div>
                <div className="mt-2 relative h-24 w-24 mx-auto rounded-full bg-[conic-gradient(from_0deg,oklch(0.72_0.18_155)_0_240deg,oklch(0.65_0.02_260)_240deg_320deg,oklch(0.65_0.25_20)_320deg_360deg)]">
                  <div className="absolute inset-2 rounded-full bg-[#0a0d16] grid place-items-center">
                    <div className="text-center">
                      <div className="text-lg font-semibold">68%</div>
                      <div className="text-[9px] text-muted-foreground">positive</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12 glass rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-purple-300 mb-3"><Atom className="h-3.5 w-3.5" /> Simulation: $40K · 14d · D2C / Skincare</div>
                <div className="grid grid-cols-4 gap-3">
                  {[{l:"Reach",v:"2.4M"},{l:"CTR",v:"3.1%"},{l:"Conv. Prob.",v:"71%"},{l:"Efficiency",v:"A"}].map((m) => (
                    <div key={m.l} className="rounded-md bg-white/5 px-3 py-2">
                      <div className="text-[10px] text-muted-foreground">{m.l}</div>
                      <div className="text-base font-semibold text-foreground">{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <section className="relative py-10 border-y border-white/5 bg-white/[0.02]">
      <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
        Native integrations across every channel
      </div>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {items.map((n, i) => (
            <div key={i} className="text-lg font-medium text-foreground/60">{n}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bento() {
  const accentMap: Record<string, string> = {
    indigo: "from-indigo-500/20 text-indigo-300",
    purple: "from-purple-500/20 text-purple-300",
    emerald: "from-emerald-500/20 text-emerald-300",
    rose: "from-rose-500/20 text-rose-300",
  };
  return (
    <section id="features" className="relative max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <div className="text-[11px] uppercase tracking-widest text-indigo-300/80">The Platform</div>
        <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">10 Modules. <span className="text-gradient">One brain.</span></h2>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Every team. Every channel. Every metric — orchestrated by a single AI that knows your brand inside out.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[180px] gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.title}
              whileHover={{ y: -4 }}
              className={`relative group glass rounded-2xl p-6 overflow-hidden ${m.span ?? ""}`}
            >
              <div className={`absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl bg-gradient-to-br opacity-50 ${accentMap[m.accent].split(" ")[0]}`} />
              <Icon className={`h-6 w-6 ${accentMap[m.accent].split(" ")[1]}`} />
              <div className="mt-4 text-lg font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              <div className="absolute bottom-4 right-5 text-xs text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function ReplacementCalculator() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(REPLACED_TOOLS.map((t) => [t.name, true]))
  );
  const total = REPLACED_TOOLS.reduce((s, t) => s + (enabled[t.name] ? t.cost : 0), 0);
  const ourPrice = 599;
  const savings = Math.max(total - ourPrice, 0);
  const pct = total ? Math.round((savings / total) * 100) : 0;

  return (
    <section id="calc" className="relative max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <div className="text-[11px] uppercase tracking-widest text-emerald-300/80">UVP</div>
        <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">One AI Platform. <span className="text-gradient">10–15 Tools Replaced.</span></h2>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Toggle the tools your team currently pays for and watch your bill collapse.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-rose-300"><X className="h-4 w-4" /> Messy Stack</div>
            <div className="text-sm text-muted-foreground">${total.toLocaleString()}/mo</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {REPLACED_TOOLS.map((t) => {
              const on = enabled[t.name];
              return (
                <button
                  key={t.name}
                  onClick={() => setEnabled((e) => ({ ...e, [t.name]: !e[t.name] }))}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${on ? "bg-rose-500/10 border-rose-500/30 text-foreground" : "bg-white/[0.02] border-white/10 text-muted-foreground line-through"}`}
                >
                  <span>{t.name}</span>
                  <span className="text-xs">${t.cost}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative rounded-2xl p-6 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border border-indigo-400/30 glow-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-indigo-300"><Shield className="h-4 w-4" /> BrandSync Unified Shield</div>
            <div className="text-sm text-muted-foreground">${ourPrice}/mo</div>
          </div>
          <div className="rounded-xl bg-[#0a0d16]/60 p-6">
            <div className="text-[11px] uppercase tracking-widest text-emerald-300">You Save</div>
            <div className="mt-1 text-5xl font-semibold text-emerald-300">${savings.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">per month — that's <span className="text-emerald-300">{pct}%</span> off your current MarTech bill.</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {["All channels", "AI creative", "Auto-pilot ads", "Predictive ROI", "CRM + Inbox", "Listening", "Reporting", "Influencers"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-foreground/80"><Check className="h-3 w-3 text-emerald-400" /> {f}</div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-emerald-400" /> Avg. customer reduces MarTech spend by <span className="text-emerald-300 font-medium">62%</span> in 90 days.
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="relative max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <div className="text-[11px] uppercase tracking-widest text-purple-300/80">Pricing</div>
        <h2 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">Pay for outcomes, not licenses.</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((t) => (
          <div key={t.name} className={`relative rounded-2xl p-6 glass ${t.popular ? "ring-1 ring-indigo-400/40 glow-primary" : ""}`}>
            {t.popular && <div className="absolute -top-3 left-6 text-[10px] uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 rounded">Most Popular</div>}
            <div className={`inline-block text-xs uppercase tracking-widest bg-gradient-to-r ${t.accent} bg-clip-text text-transparent`}>{t.name}</div>
            <div className="mt-2 text-4xl font-semibold">${t.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
            <div className="text-sm text-muted-foreground">{t.blurb}</div>
            <ul className="mt-5 space-y-2 text-sm">
              {t.features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> {f}</li>)}
            </ul>
            <Link to="/dashboard/billing" className={`mt-6 inline-flex items-center justify-center w-full rounded-lg h-11 text-sm font-medium ${t.popular ? "bg-gradient-to-r from-indigo-500 to-purple-600" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
              {t.popular ? "Start free trial" : "Choose plan"}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 p-10 text-center bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <h3 className="text-3xl md:text-5xl font-semibold tracking-tight">Stop juggling tools.<br/><span className="text-gradient">Start running marketing as one.</span></h3>
          <Link to="/dashboard/intelligence" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 h-12 font-medium glow-primary">
            Enter the OS <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-10 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <div>© BrandSync AI · The Marketing OS</div>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <a className="hover:text-white" href="#">Terms</a>
          <a className="hover:text-white" href="#">Status</a>
        </div>
      </div>
    </footer>
  );
}

// silence unused
void Button;
