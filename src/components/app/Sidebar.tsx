import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Sparkles, Megaphone, Users, Contact, Star, Shield,
  BarChart3, Layers, Atom, ChevronLeft, Zap, CreditCard, FileText, Plug, Globe,
  ChevronDown, Wand2, Layout as LayoutIcon, Shirt, Box, Camera,
  MessageSquareQuote, Hash, Tag, Image as ImageIcon, ScrollText,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";

const CREATIVE_SUBGROUPS = [
  {
    id: "visual",
    label: "Visual Studio",
    items: [
      { tool: "image-lab", label: "Image Lab", icon: Wand2 },
      { tool: "poster", label: "Poster Studio", icon: LayoutIcon },
      { tool: "try-on", label: "Virtual Try-On", icon: Shirt },
      { tool: "holography", label: "Product Holography", icon: Box },
      { tool: "product-photo", label: "Product Photography", icon: Camera },
    ],
  },
  {
    id: "copy",
    label: "Content & Copywriting",
    items: [
      { tool: "blog", label: "Blog Pilot", icon: FileText },
      { tool: "caption", label: "Caption Craft", icon: MessageSquareQuote },
      { tool: "hashtags", label: "Hashtag Wizard", icon: Hash },
      { tool: "product-desc", label: "Product Description", icon: Tag },
    ],
  },
  {
    id: "youtube",
    label: "YouTube Marketing",
    items: [
      { tool: "thumbnail", label: "Thumbnail Generator", icon: ImageIcon },
      { tool: "script", label: "Smart Script Writer", icon: ScrollText },
    ],
  },
] as const;

const TEMPLATE_SUBGROUP = {
  id: "template",
  label: "Template",
  icon: LayoutGrid,
  items: [
    { to: "/dashboard/creative/templates", label: "Template Gallery", icon: LayoutGrid },
  ],
} as const;

const TOOL_TO_GROUP: Record<string, string> = CREATIVE_SUBGROUPS.reduce(
  (acc, g) => {
    g.items.forEach((it) => { acc[it.tool] = g.id; });
    return acc;
  },
  {} as Record<string, string>,
);

const NAV = [
  { group: "Setup", items: [
    { to: "/dashboard/brand-dna-setup", label: "Brand DNA", icon: Plug, badge: "Start" },
    { to: "/dashboard/website-analysis", label: "Website Intelligence", icon: Globe },
  ]},
  { group: "AI Tools", items: [
    { to: "/dashboard/brand-guideline", label: "Brand Guideline Generator", icon: FileText, badge: "New" },
  ]},
  { group: "Intelligence", items: [
    { to: "/dashboard/intelligence", label: "Brand Intelligence", icon: Brain },
    { to: "/dashboard/audience", label: "Audience Intelligence", icon: Users },
    { to: "/dashboard/reputation", label: "Reputation & Listening", icon: Shield },
  ]},
  { group: "Execution", items: [
    { to: "/dashboard/creative", label: "Creative Engine", icon: Sparkles, creative: true as const },
    { to: "/dashboard/campaigns", label: "Campaign Automation", icon: Megaphone },
    { to: "/dashboard/influencers", label: "Influencer OS", icon: Star },
  ]},
  { group: "Growth", items: [
    { to: "/dashboard/crm", label: "Lead & CRM", icon: Contact },
    { to: "/dashboard/analytics", label: "Unified Analytics", icon: BarChart3 },
    { to: "/dashboard/simulation", label: "Simulation Engine", icon: Atom },
  ]},
  { group: "Workspace", items: [
    { to: "/dashboard/collaboration", label: "Collaboration", icon: Layers },
    { to: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard },
  ]},
];

function SidebarComponent() {
  const [collapsed, setCollapsed] = useState(false);
  // Select only pathname to prevent re-renders on other router state changes
  const path = useRouterState({ select: (s) => s.location.pathname });
  const currentTool = useRouterState({ select: (s) => (s.location.search as { tool?: string })?.tool ?? null });
  const onCreativeRoute = path === "/dashboard/creative";
  const onTemplatesRoute = path.startsWith("/dashboard/creative/templates");

  const [creativeOpen, setCreativeOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("creativeEngineOpen") === "1";
  });
  const [openSubGroups, setOpenSubGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["visual"];
    try {
      const raw = localStorage.getItem("creativeOpenSubGroups");
      return raw ? (JSON.parse(raw) as string[]) : ["visual"];
    } catch {
      return ["visual"];
    }
  });
  const [templateOpen, setTemplateOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("brandsync_creative_nav_state");
      return raw ? !!JSON.parse(raw).templateOpen : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("creativeEngineOpen", creativeOpen ? "1" : "0");
  }, [creativeOpen]);
  useEffect(() => {
    localStorage.setItem("creativeOpenSubGroups", JSON.stringify(openSubGroups));
  }, [openSubGroups]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("brandsync_creative_nav_state");
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        "brandsync_creative_nav_state",
        JSON.stringify({ ...prev, templateOpen }),
      );
    } catch {
      /* noop */
    }
  }, [templateOpen]);

  // Auto-open accordion & relevant sub-group on direct navigation
  useEffect(() => {
    if (onTemplatesRoute) {
      setCreativeOpen(true);
      setTemplateOpen(true);
      return;
    }
    if (!onCreativeRoute) return;
    setCreativeOpen(true);
    const g = currentTool ? TOOL_TO_GROUP[currentTool] : "visual";
    if (g) {
      setOpenSubGroups((prev) => (prev.includes(g) ? prev : [...prev, g]));
    }
  }, [onCreativeRoute, onTemplatesRoute, currentTool]);

  const toggleSubGroup = (id: string) =>
    setOpenSubGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="sticky top-0 h-screen shrink-0 border-r border-white/5 bg-[#0a0d16]/80 backdrop-blur-xl z-30 will-change-transform"
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center glow-primary">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-semibold text-sm">BrandSync <span className="text-indigo-400">AI</span></div>
              <div className="text-[10px] text-muted-foreground tracking-wider uppercase">Marketing OS</div>
            </div>
          )}
        </Link>
        <button onClick={() => setCollapsed(c => !c)} className="text-muted-foreground hover:text-foreground transition">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="px-2 py-4 space-y-5 overflow-y-auto h-[calc(100vh-4rem)]">
        {NAV.map((g) => (
          <div key={g.group}>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground/70"
                >
                  {g.group}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-1">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = path === it.to;
                const isCreative = "creative" in it && it.creative;

                if (isCreative) {
                  return (
                    <div key={it.to}>
                      <button
                        onClick={() => setCreativeOpen((o) => !o)}
                        className={cn(
                          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                          active
                            ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-400/30"
                            : "text-muted-foreground hover:text-white hover:bg-white/5",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="navdot"
                            className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500"
                          />
                        )}
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-indigo-300")} />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1 text-left">{it.label}</span>
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", creativeOpen && "rotate-180")} />
                          </>
                        )}
                      </button>
                      <AnimatePresence initial={false}>
                        {creativeOpen && !collapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 ml-3 pl-2 border-l border-white/10 space-y-2 py-1">
                              {CREATIVE_SUBGROUPS.map((sg) => {
                                const subOpen = openSubGroups.includes(sg.id);
                                return (
                                  <div key={sg.id}>
                                    <button
                                      onClick={() => toggleSubGroup(sg.id)}
                                      className="w-full flex items-center gap-1.5 px-2 py-1 text-[9.5px] uppercase tracking-widest text-muted-foreground/70 hover:text-foreground/80"
                                    >
                                      <span className="flex-1 text-left">{sg.label}</span>
                                      <ChevronDown className={cn("h-3 w-3 transition-transform", subOpen && "rotate-180")} />
                                    </button>
                                    <AnimatePresence initial={false}>
                                      {subOpen && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="py-0.5 space-y-0.5">
                                            {sg.items.map((sub) => {
                                              const SubIcon = sub.icon;
                                              const subActive = onCreativeRoute && (currentTool ?? "image-lab") === sub.tool;
                                              return (
                                                <Link
                                                  key={sub.tool}
                                                  to="/dashboard/creative"
                                                  search={{ tool: sub.tool }}
                                                  className={cn(
                                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                                    subActive
                                                      ? "bg-[rgba(123,110,246,0.2)] text-[#c8c2ff]"
                                                      : "text-white/[0.38] hover:text-white hover:bg-white/5",
                                                  )}
                                                >
                                                  <SubIcon className={cn("h-3.5 w-3.5 shrink-0", subActive ? "opacity-100" : "opacity-70")} />
                                                  <span className="truncate">{sub.label}</span>
                                                </Link>
                                              );
                                            })}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                              {/* Template subgroup */}
                              <div key={TEMPLATE_SUBGROUP.id}>
                                <button
                                  onClick={() => setTemplateOpen((o) => !o)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 text-[9.5px] uppercase tracking-widest text-muted-foreground/70 hover:text-foreground/80"
                                >
                                  <LayoutGrid className="h-3 w-3 opacity-70" />
                                  <span className="flex-1 text-left">{TEMPLATE_SUBGROUP.label}</span>
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", templateOpen && "rotate-180")} />
                                </button>
                                <AnimatePresence initial={false}>
                                  {templateOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="py-0.5 space-y-0.5">
                                        {TEMPLATE_SUBGROUP.items.map((sub) => {
                                          const SubIcon = sub.icon;
                                          const subActive = path.startsWith(sub.to);
                                          return (
                                            <Link
                                              key={sub.to}
                                              to={sub.to}
                                              className={cn(
                                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                                subActive
                                                  ? "bg-[rgba(123,110,246,0.2)] text-[#c8c2ff]"
                                                  : "text-white/[0.38] hover:text-white hover:bg-white/5",
                                              )}
                                            >
                                              <SubIcon className={cn("h-3.5 w-3.5 shrink-0", subActive ? "opacity-100" : "opacity-70")} />
                                              <span className="truncate">{sub.label}</span>
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                      active
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-400/30"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="navdot"
                        className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500"
                      />
                    )}
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-indigo-300")} />
                    {!collapsed && (
                      <span className="truncate flex-1 flex items-center gap-2">
                        {it.label}
                        {"badge" in it && it.badge && (
                          <span className="ml-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-white font-semibold">{it.badge}</span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </motion.aside>
  );
}

// Memoize to prevent unnecessary re-renders when router state changes (other than pathname)
// The component already uses selective state (pathname only), so memo is an extra optimization
export const Sidebar = memo(SidebarComponent);
