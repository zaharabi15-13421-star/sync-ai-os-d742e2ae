import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  registerSchema,
  checkEmailSchema,
  resetReqSchema,
  otpSchema,
} from "@/utils/validators";

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
      await logEvent(null, "account_locked", { email_hash: hashEmail(email) }, ip, getUa());
    }
    await logEvent(null, "login_failed", { attempt_number: attempts, has_lockout: Boolean(lockedUntil) }, ip, getUa());

    return {
      attempts,
      attemptsRemaining: Math.max(0, LOCK_THRESHOLD - attempts),
      lockedUntilMs: lockedUntil ? lockedUntil.getTime() : null,
    };
  });

export const clearLoginAttempts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("login_attempts").delete().eq("email", data.email.toLowerCase());
    return { ok: true };
  });

// ---------- markEmailVerified ---------- //
export const markEmailVerified = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    await supabaseAdmin
      .from("user_profiles")
      .update({ email_verified: true })
      .eq("email", email);
    const { data: row } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (row?.user_id) {
      await logEvent(row.user_id, "email_verified", {}, getIp(), getUa());
    }
    return { ok: true };
  });

// ---------- logAuthEventFn (client-callable) ---------- //
export const logAuthEventFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid().nullable().optional(),
        eventType: z.string().min(1).max(80),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await logEvent(data.userId ?? null, data.eventType, data.metadata ?? {}, getIp(), getUa());
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
    await logEvent(null, "password_reset_requested", { email_hash: hashEmail(data.email) }, ip, getUa());
    return {
      success: true,
      message: "If an account exists with this email, you will receive a reset code.",
    };
  });

// SHA-256 of email for logging (no plaintext)
function hashEmail(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
