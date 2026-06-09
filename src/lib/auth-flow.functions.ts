import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  registerSchema,
  checkEmailSchema,
  resetReqSchema,
  otpSchema,
} from "@/utils/validators";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


// ---------- shared helpers ---------- //
async function logEvent(
  userId: string | null,
  eventType: string,
  metadata: Record<string, unknown> = {},
  ip?: string | null,
  ua?: string | null,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("auth_events").insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata as never,
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    });
  } catch (e) {
    // never throw from logging
    console.error("[auth_events] insert failed", e);
  }
}

function getIp(): string | null {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}
function getUa(): string | null {
  return getRequestHeader("user-agent") || null;
}

// Naive in-memory rate limiter (per worker instance). Acceptable for soft IP throttling.
const RL = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = RL.get(key);
  if (!entry || entry.reset < now) {
    RL.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ---------- registerUser ---------- //
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getIp();
    const ua = getUa();

    if (!rateLimit(`reg:${ip ?? "unknown"}`, 5, 60 * 60 * 1000)) {
      throw new Error("Too many registration attempts. Please try again later.");
    }

    // STEP 0 — server-side email validation (format, length, disposable)
    const { validateEmailFormat, isDisposableEmail } = await import("@/utils/emailValidator");
    const normalizedEmail = data.email.trim().toLowerCase();
    if (normalizedEmail.length > 254) throw new Error("email_too_long");
    const fmt = validateEmailFormat(normalizedEmail);
    if (!fmt.valid) throw new Error("invalid_email_format");
    if (isDisposableEmail(normalizedEmail)) throw new Error("disposable_email");
    data.email = normalizedEmail;

    // Verify domain has working DNS/MX so we don't create accounts for
    // non-existent mailboxes like akashchopra@gamil-typo-domain.xyz
    const at = normalizedEmail.lastIndexOf("@");
    const domain = at >= 0 ? normalizedEmail.slice(at + 1) : "";
    if (domain) {
      const ok = await checkDomainDeliverable(domain);
      if (!ok) {
        await logEvent(null, "registration_form_error", { reason: "undeliverable_email_domain" }, ip, ua);
        throw new Error("undeliverable_email");
      }
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


    // Duplicate check (against user_profiles.email — populated on signup)
    const { data: existing } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email", data.email)
      .maybeSingle();
    if (existing) {
      await logEvent(null, "registration_form_error", { reason: "email_exists" }, ip, ua);
      throw new Error("EMAIL_EXISTS");
    }

    // Create auth user without confirming email yet (OTP step does that)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        company_name: data.company_name,
        industry: data.industry,
        team_size: data.team_size,
        website_url: data.website_url || null,
        full_name: data.company_name,
      },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "";
      if (/registered|exists/i.test(msg)) throw new Error("EMAIL_EXISTS");
      console.error("[registerUser] createUser failed", createErr);
      throw new Error("Something went wrong on our end. Please try again.");
    }

    const userId = created.user.id;

    // Insert profile row (the handle_new_user trigger may have already created one)
    const { error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          company_name: data.company_name,
          email: data.email,
          industry: data.industry,
          team_size: data.team_size,
          website_url: data.website_url || null,
          email_verified: false,
          plan: "starter",
          onboarding_completed: false,
        },
        { onConflict: "user_id" },
      );
    if (profileErr) {
      console.error("[registerUser] profile upsert failed", profileErr);
    }

    await logEvent(userId, "signup_started", {
      industry: data.industry,
      team_size: data.team_size,
      has_website: Boolean(data.website_url),
    }, ip, ua);

    return { success: true, user_id: userId, message: "Verification email sent" };
  });

// ---------- checkEmailExists ---------- //
export const checkEmailExists = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkEmailSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getIp();
    if (!rateLimit(`check:${ip ?? "unknown"}`, 10, 60 * 1000)) {
      // Always answer with a stable shape, even when rate-limited
      return { exists: false };
    }

    const start = Date.now();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email", data.email)
      .maybeSingle();

    // Pad response time to mitigate timing oracle
    const elapsed = Date.now() - start;
    if (elapsed < 180) await new Promise((r) => setTimeout(r, 180 - elapsed));

    return { exists: Boolean(row) };
  });

// ---------- verifyEmailDeliverable (DNS MX check via DoH) ---------- //
// Confirms the email's domain actually exists and can receive mail. Uses
// Cloudflare DNS-over-HTTPS, which works inside the Worker runtime where
// node:dns is not available.
const MX_CACHE = new Map<string, { ok: boolean; expires: number }>();
const MX_CACHE_TTL_MS = 10 * 60 * 1000;

async function checkDomainDeliverable(domain: string): Promise<boolean> {
  const d = domain.trim().toLowerCase();
  if (!d || !d.includes(".")) return false;
  const cached = MX_CACHE.get(d);
  if (cached && cached.expires > Date.now()) return cached.ok;

  async function doh(type: "MX" | "A" | "AAAA"): Promise<boolean> {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(d)}&type=${type}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    try {
      const res = await fetch(url, { headers: { accept: "application/dns-json" }, signal: ctl.signal });
      if (!res.ok) return false;
      const json = (await res.json()) as { Status?: number; Answer?: Array<{ data: string }> };
      if (json.Status === 3) return false;
      return Array.isArray(json.Answer) && json.Answer.length > 0;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const ok = (await doh("MX")) || (await doh("A")) || (await doh("AAAA"));
    MX_CACHE.set(d, { ok, expires: Date.now() + MX_CACHE_TTL_MS });
    return ok;
  } catch {
    // On infrastructure failure, be lenient so a transient DNS hiccup doesn't
    // block all signups. The duplicate check + real email send remain as guards.
    return true;
  }
}


export const verifyEmailDeliverable = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkEmailSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getIp();
    if (!rateLimit(`mx:${ip ?? "unknown"}`, 30, 60 * 1000)) {
      return { deliverable: true, checked: false };
    }
    const email = data.email.trim().toLowerCase();
    const at = email.lastIndexOf("@");
    if (at < 0) return { deliverable: false, checked: true, reason: "format" as const };
    const domain = email.slice(at + 1);
    if (!domain || !domain.includes(".")) {
      return { deliverable: false, checked: true, reason: "format" as const };
    }
    const ok = await checkDomainDeliverable(domain);
    return { deliverable: ok, checked: true, reason: ok ? undefined : ("no_mx" as const) };
  });



// ---------- recordLoginAttempt / checkLockout ---------- //
const LOCK_THRESHOLD = 5;
const LOCK_WINDOW_MIN = 15;

export const checkLoginLockout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("login_attempts")
      .select("attempts, locked_until")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!row) return { locked: false, attemptsRemaining: LOCK_THRESHOLD };
    const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
    if (lockedUntil && lockedUntil > new Date()) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntilMs: lockedUntil.getTime(),
      };
    }
    return {
      locked: false,
      attemptsRemaining: Math.max(0, LOCK_THRESHOLD - (row.attempts ?? 0)),
    };
  });

export const recordLoginFailure = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const ip = getIp();
    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("login_attempts")
      .select("id, attempts, locked_until")
      .eq("email", email)
      .maybeSingle();

    const now = new Date();
    let attempts = 1;
    let lockedUntil: Date | null = null;
    if (existing) {
      const prev = existing.locked_until ? new Date(existing.locked_until) : null;
      const stillLocked = prev && prev > now;
      attempts = stillLocked ? existing.attempts : (existing.attempts ?? 0) + 1;
      if (attempts >= LOCK_THRESHOLD) {
        lockedUntil = new Date(now.getTime() + LOCK_WINDOW_MIN * 60 * 1000);
      }
      await supabaseAdmin
        .from("login_attempts")
        .update({
          attempts,
          last_attempt_at: now.toISOString(),
          locked_until: lockedUntil ? lockedUntil.toISOString() : existing.locked_until,
          ip_address: ip,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("login_attempts").insert({
        email,
        ip_address: ip,
        attempts,
        last_attempt_at: now.toISOString(),
      });
    }

    if (lockedUntil) {
      await logEvent(null, "account_locked", { email_hash: await hashEmail(email) }, ip, getUa());
    }
    await logEvent(null, "login_failed", { attempt_number: attempts, has_lockout: Boolean(lockedUntil) }, ip, getUa());

    return {
      attempts,
      attemptsRemaining: Math.max(0, LOCK_THRESHOLD - attempts),
      lockedUntilMs: lockedUntil ? lockedUntil.getTime() : null,
    };
  });

export const clearLoginAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const email = data.email.toLowerCase();
    const claimEmail = (context.claims as { email?: string } | undefined)?.email?.toLowerCase();
    if (!claimEmail || claimEmail !== email) {
      throw new Error("Unauthorized");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("login_attempts").delete().eq("email", email);
    return { ok: true };
  });

// ---------- markEmailVerified ---------- //
export const markEmailVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const email = data.email.toLowerCase();
    const claimEmail = (context.claims as { email?: string } | undefined)?.email?.toLowerCase();
    if (!claimEmail || claimEmail !== email) {
      throw new Error("Unauthorized");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_profiles")
      .update({ email_verified: true })
      .eq("email", email);
    await logEvent(context.userId, "email_verified", {}, getIp(), getUa());
    return { ok: true };
  });

// ---------- logAuthEventFn (client-callable) ---------- //
// Strict allowlist of event types accepted from unauthenticated callers.
// Anything outside this list is rejected to prevent audit-log poisoning.
const ALLOWED_CLIENT_EVENT_TYPES = new Set<string>([
  "modal_opened",
  "modal_closed",
  "signup_method_selected",
  "registration_form_started",
  "registration_form_error",
  "registration_form_submitted",
  "email_verification_resent",
  "login_attempted",
  "login_success",
  "password_reset_completed",
]);

export const logAuthEventFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        eventType: z.string().min(1).max(80),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )

  .handler(async ({ data }) => {
    // Reject event types not on the allowlist to prevent audit-log poisoning.
    if (!ALLOWED_CLIENT_EVENT_TYPES.has(data.eventType)) {
      return { ok: true };
    }
    // Per-IP rate limit to prevent log flooding from anonymous callers.
    const ip = getIp();
    if (!rateLimit(`log:${ip ?? "unknown"}`, 30, 60 * 1000)) {
      return { ok: true };
    }
    // Derive userId from bearer token if present; never trust client-supplied IDs.
    let resolvedUserId: string | null = null;

    try {
      const authHeader = getRequestHeader("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length);
        if (token) {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
            const { createClient } = await import("@supabase/supabase-js");
            const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data: claimsData } = await sb.auth.getClaims(token);
            resolvedUserId = claimsData?.claims?.sub ?? null;
          }
        }
      }
    } catch {
      // ignore — logging should never throw
    }
    await logEvent(resolvedUserId, data.eventType, data.metadata ?? {}, getIp(), getUa());
    return { ok: true };
  });


// ---------- requestPasswordReset ---------- //
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetReqSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getIp();
    if (!rateLimit(`pwr:${data.email}`, 3, 60 * 60 * 1000)) {
      // Same response either way (anti-enumeration)
      return { success: true };
    }
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.resetPasswordForEmail(data.email);
    } catch (e) {
      console.error("[requestPasswordReset] failed", e);
    }
    await logEvent(null, "password_reset_requested", { email_hash: await hashEmail(data.email) }, ip, getUa());
    return {
      success: true,
      message: "If an account exists with this email, you will receive a reset code.",
    };
  });

// HMAC-SHA-256 of email for logging (no plaintext).
async function hashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const keyMaterial = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "brandsync";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyMaterial),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, enc.encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
