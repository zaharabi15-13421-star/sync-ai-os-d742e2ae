export const DASHBOARD_PATH = "/dashboard/intelligence";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const POST_AUTH_REDIRECT_KEY = "brandsync_post_auth_redirect";

export function getAuthCallbackUrl() {
  if (typeof window === "undefined") return AUTH_CALLBACK_PATH;
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

export function rememberPostAuthRedirect(path = DASHBOARD_PATH) {
  try {
    localStorage.setItem(POST_AUTH_REDIRECT_KEY, safeRedirectPath(path));
  } catch { /* noop */ }
}

export function consumePostAuthRedirect(fallback = DASHBOARD_PATH) {
  try {
    const redirectPath = localStorage.getItem(POST_AUTH_REDIRECT_KEY) ?? fallback;
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return safeRedirectPath(redirectPath, fallback);
  } catch {
    return fallback;
  }
}

export function clearPostAuthRedirect() {
  try {
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  } catch { /* noop */ }
}

function safeRedirectPath(value: string, fallback = DASHBOARD_PATH) {
  if (!value || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, typeof window === "undefined" ? "https://sync-ai-os.lovable.app" : window.location.origin);
    if (typeof window !== "undefined" && url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}