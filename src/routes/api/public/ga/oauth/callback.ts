// Google OAuth callback — exchanges the auth code for tokens, persists them, redirects back to the dashboard.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { GA4_OAUTH_REDIRECT_URI, encryptToken, exchangeCode, hasRequiredScopes, parseIdTokenEmail, verifyState } from "@/lib/ga.server";

function publicOrigin() {
  return (process.env.PUBLIC_APP_URL ?? "https://sync-ai-os.lovable.app").replace(/\/$/, "");
}

export const Route = createFileRoute("/api/public/ga/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const origin = publicOrigin();

        const back = (status: "connected" | "error", reason?: string, grantedScopesDebug?: string) => {
          const target = new URL("/dashboard/intelligence", origin);
          target.searchParams.set("ga4", status);
          if (reason) target.searchParams.set("reason", reason.slice(0, 200));
          if (grantedScopesDebug) target.searchParams.set("granted_scopes", grantedScopesDebug);
          return Response.redirect(target.toString(), 302);
        };

        if (error) return back("error", error);
        if (!code || !state) return back("error", "missing_code");

        const parsed = await verifyState(state);
        if (!parsed) return back("error", "invalid_state");

        try {
          const tok = await exchangeCode(code, GA4_OAUTH_REDIRECT_URI);
          const { email, sub } = parseIdTokenEmail(tok.id_token);
          const grantedScopes = (tok.scope ?? "").split(" ").filter(Boolean);

          // Google silently drops sensitive scopes (like Analytics) if the
          // OAuth consent screen isn't configured for them, the Analytics
          // APIs aren't enabled, or the app is in Testing mode and the user
          // isn't a test user. Detect that here and surface a clear reason
          // instead of marking the connection "connected" and failing later.
          if (!hasRequiredScopes(grantedScopes)) {
            const encodedScopes = btoa(JSON.stringify(grantedScopes))
              .replace(/=+$/, "")
              .replace(/\+/g, "-")
              .replace(/\//g, "_");
            await supabaseAdmin.from("google_connections").upsert(
              {
                company_id: parsed.companyId,
                google_user_email: email ?? null,
                google_user_id: sub ?? null,
                scopes: grantedScopes,
                access_token: null,
                access_token_expires_at: null,
                refresh_token_ciphertext: null,
                refresh_token_iv: null,
                status: "needs_reconnect",
                last_error:
                  `Google did not grant analytics.readonly. Granted scopes: ${grantedScopes.join(" ") || "none"}`,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id" },
            );
            return back("error", "analytics_scopes_not_granted", encodedScopes);
          }

          const updates: any = {
            company_id: parsed.companyId,
            google_user_email: email ?? null,
            google_user_id: sub ?? null,
            scopes: grantedScopes,
            access_token: tok.access_token,
            access_token_expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
            status: "connected",
            last_error: null,
            connection_source: parsed.source ?? "manual",
            website_url: parsed.websiteUrl ?? null,
            updated_at: new Date().toISOString(),
          };
          if (!tok.refresh_token) {
            await supabaseAdmin.from("google_connections").upsert(
              {
                company_id: parsed.companyId,
                google_user_email: email ?? null,
                google_user_id: sub ?? null,
                scopes: grantedScopes,
                access_token: null,
                access_token_expires_at: null,
                refresh_token_ciphertext: null,
                refresh_token_iv: null,
                status: "needs_reconnect",
                last_error: "Google did not return an offline refresh token. Please reconnect and approve the consent screen again.",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id" },
            );
            return back("error", "missing_refresh_token");
          }
          if (tok.refresh_token) {
            const enc = await encryptToken(tok.refresh_token);
            updates.refresh_token_ciphertext = enc.ciphertext;
            updates.refresh_token_iv = enc.iv;
          }
          await supabaseAdmin.from("google_connections").upsert(updates, { onConflict: "company_id" });

          return back("connected");
        } catch (e: any) {
          console.error("[ga4 callback]", e);
          return back("error", e?.message ?? "exchange_failed");
        }
      },
    },
  },
});
