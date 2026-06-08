import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureAuthWorkspace } from "@/lib/auth.functions";
import { finalizeAuthSessionFromUrl, hasAuthParamsInUrl } from "@/lib/auth-session";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  workspaceReady: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  workspaceReady: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const ensureWorkspace = useServerFn(ensureAuthWorkspace);
  const ensureWorkspaceRef = useRef(ensureWorkspace);
  ensureWorkspaceRef.current = ensureWorkspace;
  const lastEnsuredUserId = useRef<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let hydrated = false;
    let runId = 0;

    const applySession = (s: Session | null) => {
      if (!mounted) return;
      const currentRun = ++runId;
      setSession(s);
      const userId = s?.user?.id ?? null;
      if (!userId) {
        lastEnsuredUserId.current = null;
        setWorkspaceReady(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      const finish = (ready: boolean) => {
        if (!mounted || currentRun !== runId) return;
        setWorkspaceReady(ready);
        setLoading(false);
      };

      if (userId !== lastEnsuredUserId.current) {
        lastEnsuredUserId.current = userId;
        void ensureWorkspaceRef.current()
          .then(() => finish(true))
          .catch((error) => {
            lastEnsuredUserId.current = null;
            setWorkspaceReady(false);
            console.error("[auth] workspace bootstrap failed", error);
            finish(false);
          });
        return;
      }

      finish(true);
    };

    // Subscribe FIRST so we don't miss SIGNED_IN events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION" && !hydrated) return;
      applySession(s);
    });

    // Then hydrate the current session. If an auth provider returned tokens to
    // the current URL, finalize them before the app decides the visitor is a guest.
    const hydrate = hasAuthParamsInUrl()
      ? finalizeAuthSessionFromUrl().then(({ session }) => session)
      : supabase.auth.getSession().then(({ data }) => data.session);

    hydrate
      .then((s) => {
        hydrated = true;
        applySession(s);
      })
      .catch((error) => {
        hydrated = true;
        console.error("[auth] session bootstrap failed", error);
        if (mounted) setLoading(false);
      });

    // Safety net: never let loading hang.
    const failsafe = setTimeout(() => {
      if (mounted && !hydrated) setLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    lastEnsuredUserId.current = null;
    setWorkspaceReady(false);
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, workspaceReady, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
