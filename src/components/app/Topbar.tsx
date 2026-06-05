import { Bell, Search, Sparkles, ChevronDown, AlertTriangle, LogOut, Plug, User } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBrandDna } from "@/lib/connections.functions";

const SUGGESTIONS = [
  "Generate Q4 brand campaign brief",
  "Analyze competitor sentiment vs us",
  "Pause underperforming TikTok ads",
  "Draft 5 IG captions in viral tone",
  "Predict ROI for $20k Meta launch",
  "Find micro-influencers in EdTech",
];

export function Topbar() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(true);
  const { user, session, loading, signOut } = useAuth() as any;
  const navigate = useNavigate();
  const displayName = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.brand_name as string) || user?.email?.split("@")[0] || "Guest";
  const initials = displayName.slice(0, 2).toUpperCase();
  const subline = user ? user.email : "Demo workspace";

  const fetchDna = useServerFn(getBrandDna);
  const { data: dna } = useQuery({
    queryKey: ["brand-dna"],
    queryFn: () => fetchDna(),
    enabled: !loading && !!session?.access_token,
    staleTime: 60_000,
    retry: false,
  });
  const connectedCount = (dna?.sources ?? []).filter((s: any) => s.status === "connected").length;
  const needsSetup = !!user && connectedCount < 2;

  return (
    <>
      <header className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#0a0d16]/70 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-6 gap-4">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                onFocus={() => setOpen(true)}
                placeholder="Search campaigns, leads, creatives, insights…"
                className="w-full h-10 rounded-lg bg-white/5 border border-white/10 pl-10 pr-20 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-indigo-400/50"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {needsSetup && (
              <Link
                to="/dashboard/brand-dna-setup"
                className="hidden md:inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 h-10 text-xs font-medium text-amber-200 hover:bg-amber-500/15 transition"
              >
                <Plug className="h-3.5 w-3.5" />
                Connect platforms ({connectedCount}/2)
              </Link>
            )}
            <button
              onClick={() => setOpen(true)}
              className="group relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 h-10 text-sm font-medium text-white glow-primary hover:scale-[1.02] transition"
            >
              <Sparkles className="h-4 w-4" />
              Magic Action
            </button>

            <button onClick={() => setNotifs(false)} className="relative h-10 w-10 grid place-items-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
              <Bell className="h-4 w-4" />
              {notifs && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 ml-1 border-l border-white/10 hover:opacity-90">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-xs font-semibold">{initials}</div>
                  <div className="hidden md:block leading-tight text-left">
                    <div className="text-xs font-medium">{displayName}</div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{subline}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/profile" })}>
                      <User className="h-3.5 w-3.5 mr-2" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-xs opacity-70">{user.email}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                      <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => navigate({ to: "/" })}>Go to landing</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <AnimatePresence>
          {notifs && (
            <motion.div
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
              className="px-6 -mt-px"
            >
              <div className="flex items-center gap-3 rounded-b-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
                <span className="text-rose-200">Crisis radar:</span>
                <span className="text-foreground/80">Negative mention spike (+412%) for keyword "shipping delay" in last 30 min.</span>
                <button onClick={() => setNotifs(false)} className="ml-auto text-muted-foreground hover:text-white">dismiss</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0d1120]/95 border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-indigo-400" /> AI Command Palette
            </DialogTitle>
          </DialogHeader>
          <Input placeholder="Ask BrandSync to do anything…" className="bg-white/5 border-white/10" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Suggestions</div>
          <div className="space-y-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left text-foreground/80 hover:bg-white/5 hover:text-white">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" /> {s}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
