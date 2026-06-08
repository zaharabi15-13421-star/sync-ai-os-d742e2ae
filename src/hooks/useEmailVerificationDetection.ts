import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DASHBOARD_PATH } from "@/lib/auth-redirects";

export const AUTH_BROADCAST_CHANNEL = "brandsync-auth-channel";
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_MS = 10 * 60 * 1000;

interface Options {
  userId: string | null;
  email: string;
  enabled: boolean;
}

export function useEmailVerificationDetection({ userId, email, enabled }: Options) {
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const redirectTriggered = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let channel: BroadcastChannel | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let unsubscribe: (() => void) | null = null;
    const pollStartTime = Date.now();

    const stopAll = () => {
      try { channel?.close(); } catch { /* noop */ }
      try { unsubscribe?.(); } catch { /* noop */ }
      try { if (pollInterval) clearInterval(pollInterval); } catch { /* noop */ }
    };

    const triggerSilentRedirect = () => {
      if (redirectTriggered.current) return;
      redirectTriggered.current = true;
      stopAll();
      window.location.replace(DASHBOARD_PATH);
    };

    // Mechanism 1: BroadcastChannel
    try {
      channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || data.type !== "EMAIL_VERIFIED") return;
        if (userId && data.userId && data.userId !== userId) return;
        if (!userId && data.email && data.email !== email) return;
        triggerSilentRedirect();
      };
    } catch {
      channel = null;
    }

    // Mechanism 2: onAuthStateChange
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED" && event !== "USER_UPDATED") return;
      if (!session?.user) return;
      if (userId && session.user.id !== userId) return;
      if (!session.user.email_confirmed_at) return;
      triggerSilentRedirect();
    });
    unsubscribe = () => sub.subscription.unsubscribe();

    // Mechanism 3: Polling
    const pollOnce = async () => {
      if (redirectTriggered.current) return;
      if (Date.now() - pollStartTime > POLL_MAX_MS) {
        if (pollInterval) clearInterval(pollInterval);
        setPollingTimedOut(true);
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return;
        const session = data.session;
        if (!session?.user) return;
        if (userId && session.user.id !== userId) return;
        if (!session.user.email_confirmed_at) return;
        triggerSilentRedirect();
      } catch { /* noop */ }
    };
    void pollOnce();
    pollInterval = setInterval(pollOnce, POLL_INTERVAL_MS);

    return () => {
      redirectTriggered.current = true;
      stopAll();
    };
  }, [enabled, userId, email]);

  return { pollingTimedOut };
}
