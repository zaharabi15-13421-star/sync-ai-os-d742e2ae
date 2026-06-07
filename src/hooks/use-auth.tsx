import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureAuthWorkspace } from "@/lib/auth.functions";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const ensureWorkspace = useServerFn(ensureAuthWorkspace);
  const lastEnsuredUserId = useRef<string | null>(null);
  // Synchronously check localStorage for existing session to prevent blank flash
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      // Supabase stores auth token in localStorage with 'auth-token' in key name
      const keys = Object.keys(localStorage);
      const authKey = keys.find(k => k.includes('auth-token') || k.includes('sb-'));
      if (!authKey) return null;

      const raw = localStorage.getItem(authKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      // Return the session if available
      return parsed?.session ?? null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialized = false;
    const bootstrap = (s: Session | null, ready = true) => {
      if (!mounted) return;
      setSession(s);
      if (ready) setLoading(false);
      const userId = s?.user?.id ?? null;
      if (userId && userId !== lastEnsuredUserId.current) {
        lastEnsuredUserId.current = userId;
        void ensureWorkspace().catch((error) => {
          console.error("[auth] workspace bootstrap failed", error);
        });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setTimeout(() => {
        if (!initialized && event === "INITIAL_SESSION") return;
        bootstrap(s);
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      initialized = true;
      bootstrap(data.session);
    }).catch((error) => {
      console.error("[auth] session bootstrap failed", error);
      initialized = true;
      bootstrap(null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [ensureWorkspace]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
