import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_BROADCAST_CHANNEL } from "@/hooks/useEmailVerificationDetection";
import { DASHBOARD_PATH, consumePostAuthRedirect } from "@/lib/auth-redirects";

const AUTO_REDIRECT_MS = 2500;

type CallbackState = "processing" | "success";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const [state, setState] = useState<CallbackState>("processing");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const broadcastVerified = (userId: string, email: string | undefined) => {
      try {
        const ch = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
        ch.postMessage({
          type: "EMAIL_VERIFIED",
          userId,
          email,
          timestamp: Date.now(),
          source: "auth_callback",
        });
        ch.close();
      } catch { /* noop */ }
    };

    const goToDashboard = () => {
      window.location.replace(consumePostAuthRedirect());
    };

    const goHome = () => {
      window.location.replace("/");
    };

    const run = async () => {
      try {
        const hash = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ""));

        const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type") as "signup" | "magiclink" | "recovery" | "email" | null;
        const errParam = hashParams.get("error") ?? searchParams.get("error");

        if (errParam) {
          if (!cancelled) goHome();
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          if (error) throw error;
        }

        window.history.replaceState(null, "", window.location.pathname);

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const session = data.session;

        if (!session?.user) {
          if (!cancelled) goHome();
          return;
        }

        const user = session.user;

        if (!user.email_confirmed_at) {
          if (!cancelled) goHome();
          return;
        }

        // Detect OAuth (Google) sign-in vs. email verification
        const provider =
          (user.app_metadata?.provider as string | undefined) ??
          user.identities?.[0]?.provider;
        const isOAuth = provider && provider !== "email";

        const confirmedAt = new Date(user.email_confirmed_at).getTime();
        const isFreshEmailVerification = !isOAuth && Date.now() - confirmedAt < 30_000;

        void supabase
          .from("profiles")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", user.id)
          .then(() => undefined, () => undefined);

        // OAuth logins and previously-verified users: redirect directly, no popup
        if (!isFreshEmailVerification) {
          if (!cancelled) goToDashboard();
          return;
        }

        broadcastVerified(user.id, user.email);

        if (!cancelled) {
          setState("success");
          redirectTimerRef.current = setTimeout(goToDashboard, AUTO_REDIRECT_MS);
        }
      } catch (err) {
        console.error("[auth callback] failed", err);
        if (!cancelled) goHome();
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelTimerAndGo = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    window.location.href = DASHBOARD_PATH;
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#0F0F1A" }}
    >
      {state === "processing" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#7C3AED" }} />
          <p className="text-[14px]" style={{ color: "#94A3B8" }}>
            Signing you in…
          </p>
        </div>
      )}

      {state === "success" && (
        <div
          className="text-center w-full"
          style={{
            maxWidth: 400,
            background: "#1A1A2E",
            border: "0.5px solid #22C55E",
            borderRadius: 16,
            padding: "40px 32px",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
            className="mx-auto grid place-items-center"
            style={{
              width: 64,
              height: 64,
              background: "rgba(34,197,94,0.15)",
              borderRadius: "50%",
            }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: "#22C55E" }} />
          </motion.div>
          <h1
            className="text-[22px] font-medium"
            style={{ color: "#22C55E", marginTop: 20 }}
          >
            Email verified!
          </h1>
          <p
            className="text-[14px]"
            style={{ color: "#94A3B8", lineHeight: 1.6, marginTop: 8 }}
          >
            Your account is ready. Welcome to BrandSync AI — your marketing OS is waiting.
          </p>
          <div
            style={{
              width: "100%",
              height: 3,
              background: "#2D2D4E",
              borderRadius: 2,
              marginTop: 24,
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: AUTO_REDIRECT_MS / 1000, ease: "linear" }}
              style={{ height: "100%", background: "#7C3AED", borderRadius: 2 }}
            />
          </div>
          <button
            type="button"
            onClick={cancelTimerAndGo}
            className="w-full text-white"
            style={{
              background: "#7C3AED",
              borderRadius: 10,
              padding: "13px 24px",
              fontSize: 14,
              fontWeight: 500,
              marginTop: 20,
            }}
          >
            Enter dashboard →
          </button>
        </div>
      )}
    </main>
  );
}
