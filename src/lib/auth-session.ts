import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { consumePostAuthRedirect } from "@/lib/auth-redirects";

const AUTH_PARAM_NAMES = new Set([
  "access_token",
  "refresh_token",
  "expires_at",
  "expires_in",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "code",
  "token_hash",
  "type",
  "error",
  "error_code",
  "error_description",
]);

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

let finalizeInFlight: Promise<{ handled: boolean; session: Session | null }> | null = null;

export function hasAuthParamsInUrl() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  for (const key of AUTH_PARAM_NAMES) {
    if (url.searchParams.has(key) || hashParams.has(key)) return true;
  }
  return false;
}

export async function finalizeAuthSessionFromUrl() {
  if (typeof window === "undefined") return { handled: false, session: null as Session | null };

  if (finalizeInFlight) return finalizeInFlight;

  finalizeInFlight = finalizeAuthSessionFromUrlInternal().finally(() => {
    finalizeInFlight = null;
  });

  return finalizeInFlight;
}

async function finalizeAuthSessionFromUrlInternal() {
  if (typeof window === "undefined") return { handled: false, session: null as Session | null };

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const searchParams = url.searchParams;
  const get = (key: string) => hashParams.get(key) ?? searchParams.get(key);

  const err = get("error");
  if (err) {
    cleanAuthParamsFromUrl();
    throw new Error(get("error_description") ?? err);
  }

  const accessToken = get("access_token");
  const refreshToken = get("refresh_token");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as OtpType | null;
  let handled = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    handled = true;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    handled = true;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) throw error;
    handled = true;
  }

  if (handled) cleanAuthParamsFromUrl();

  const session = await waitForAuthSession(handled ? 5000 : 1000);
  return { handled, session };
}

export async function waitForAuthSession(timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.access_token) return data.session;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

export async function redirectToAuthenticatedDestination(timeoutMs = 5000) {
  const session = await waitForAuthSession(timeoutMs);
  if (!session?.access_token) return { ok: false as const };
  window.location.replace(consumePostAuthRedirect());
  return { ok: true as const };
}

function cleanAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of AUTH_PARAM_NAMES) url.searchParams.delete(key);
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}