export const DASHBOARD_PATH = "/dashboard/intelligence";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const POST_AUTH_REDIRECT_KEY = "brandsync_post_auth_redirect";

export function getAuthCallbackUrl() {
  if (typeof window === "undefined") return AUTH_CALLBACK_PATH;
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

export function rememberPostAuthRedirect(path = DASHBOARD_PATH) {
  try {
    localStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
  } catch { /* noop */ }
}

export function consumePostAuthRedirect(fallback = DASHBOARD_PATH) {
  try {
    const redirectPath = localStorage.getItem(POST_AUTH_REDIRECT_KEY) ?? fallback;
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return redirectPath;
  } catch {
    return fallback;
  }
}