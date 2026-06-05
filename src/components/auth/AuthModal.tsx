import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Mail, CheckCircle2, KeyRound, LockOpen, AlertCircle, Loader2, ShieldCheck, RefreshCw, Pencil, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  Label, FieldError, TextField, SelectField, PasswordField, PasswordRequirements,
  OTPInput, GoogleOAuthButton, AuthDivider, PrimaryButton, GhostButton,
} from "@/components/auth/shared";
import { scorePassword } from "@/utils/passwordScorer";
import { EMAIL_REGEX, normalizeUrl, sanitizeText } from "@/utils/validators";
import {
  registerUser, checkEmailExists, recordLoginFailure, clearLoginAttempts,
  checkLoginLockout, markEmailVerified, requestPasswordReset, logAuthEventFn,
} from "@/lib/auth-flow.functions";
import { INDUSTRIES, TEAM_SIZES, type AuthScreen, type AuthTab, type RegistrationErrors, type RegistrationFormValues } from "@/types/auth";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab?: AuthTab;
}

const DASHBOARD_PATH = "/dashboard/intelligence";

export function AuthModal({ open, onOpenChange, initialTab = "signup" }: AuthModalProps) {
  const [screen, setScreen] = useState<AuthScreen>("entry");
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const startTimeRef = useRef<number>(Date.now());

  // Reset when opened
  useEffect(() => {
    if (open) {
      setScreen("entry");
      setTab(initialTab);
      startTimeRef.current = Date.now();
      logAuthEventFn({ data: { eventType: "modal_opened", metadata: { source: "direct" } } }).catch(() => {});
    }
  }, [open, initialTab]);

  // Close handlers
  const close = useCallback(() => {
    logAuthEventFn({
      data: {
        eventType: "modal_closed",
        metadata: { screen_at_close: screen, completed: screen === "success" },
      },
    }).catch(() => {});
    onOpenChange(false);
  }, [onOpenChange, screen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative mx-4 w-full max-h-[92vh] overflow-y-auto"
          style={{
            maxWidth: 420,
            background: "var(--auth-bg-modal)",
            border: "0.5px solid var(--auth-border)",
            borderRadius: 16,
            padding: "28px 24px",
            color: "var(--auth-text-primary)",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 grid place-items-center"
            style={{ width: 32, height: 32, color: "var(--auth-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>

          {screen === "entry" && (
            <EntryScreen
              tab={tab}
              setTab={setTab}
              onEmail={() => setScreen(tab === "signup" ? "register" : "login")}
              onGoogleDone={() => onOpenChange(false)}
            />
          )}
          {screen === "register" && (
            <RegisterScreen
              onBack={() => setScreen("entry")}
              onDone={(email, userId) => {
                setRegisteredEmail(email);
                setRegisteredUserId(userId);
                setScreen("verify");
              }}
            />
          )}
          {screen === "verify" && (
            <VerifyScreen
              email={registeredEmail}
              userId={registeredUserId}
              onSuccess={() => setScreen("success")}
              onChangeEmail={() => setScreen("register")}
              startedAt={startTimeRef.current}
            />
          )}
          {screen === "success" && <SuccessScreen onClose={close} />}
          {screen === "login" && (
            <LoginScreen
              onBack={() => setScreen("entry")}
              onForgot={() => setScreen("forgot")}
              onSuccess={close}
              onGoogleDone={() => onOpenChange(false)}
            />
          )}
          {screen === "forgot" && (
            <ForgotScreen
              onBack={() => setScreen("login")}
              onSent={(email) => { setResetEmail(email); setScreen("reset-verify"); }}
            />
          )}
          {screen === "reset-verify" && (
            <ResetVerifyScreen
              email={resetEmail}
              onVerified={() => setScreen("reset-password")}
              onBack={() => setScreen("forgot")}
            />
          )}
          {screen === "reset-password" && <ResetPasswordScreen onDone={close} />}
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}

// ============================================================
// Screen 1: Entry
// ============================================================
function EntryScreen({
  tab, setTab, onEmail, onGoogleDone,
}: { tab: AuthTab; setTab: (t: AuthTab) => void; onEmail: () => void; onGoogleDone: () => void }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      logAuthEventFn({ data: { eventType: "signup_method_selected", metadata: { method: "google" } } }).catch(() => {});
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: result.error.message });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome to BrandSync AI!");
      onGoogleDone();
      navigate({ to: DASHBOARD_PATH });
    } catch (e) {
      toast.error("Google sign-in failed", { description: e instanceof Error ? e.message : "Please try again." });
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <header className="mb-5">
        <h2 id="auth-modal-title" className="text-[22px] font-medium flex items-center gap-2" style={{ color: "var(--auth-text-primary)" }}>
          <Sparkles className="h-5 w-5" style={{ color: "var(--auth-purple-light)" }} />
          Start your free demo
        </h2>
        <p className="text-[13px] mt-1" style={{ color: "var(--auth-text-muted)" }}>
          Get instant access. No credit card required.
        </p>
      </header>

      <div
        className="flex p-[3px] mb-5"
        style={{ background: "var(--auth-bg-base)", borderRadius: 10 }}
        role="tablist"
      >
        {(["signup", "login"] as AuthTab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-[14px] transition-colors"
            style={{
              background: tab === t ? "var(--auth-border)" : "transparent",
              borderRadius: 8,
              color: tab === t ? "var(--auth-text-primary)" : "var(--auth-text-muted)",
              fontWeight: tab === t ? 500 : 400,
            }}
          >
            {t === "signup" ? "Sign up" : "Log in"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <GoogleOAuthButton onClick={handleGoogle} loading={googleLoading} />
        <AuthDivider />
        <button
          type="button"
          onClick={() => {
            logAuthEventFn({ data: { eventType: "signup_method_selected", metadata: { method: "email" } } }).catch(() => {});
            onEmail();
          }}
          className="w-full text-white text-[14px] font-medium"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #A855F7)",
            borderRadius: 10,
            padding: 12,
          }}
        >
          {tab === "signup" ? "Sign up with email" : "Log in with email"}
        </button>
      </div>
    </>
  );
}

// ============================================================
// Screen 2: Registration
// ============================================================
function RegisterScreen({ onBack, onDone }: { onBack: () => void; onDone: (email: string, userId: string) => void }) {
  const [v, setV] = useState<RegistrationFormValues>({
    companyName: "", email: "", industry: "", teamSize: "",
    websiteUrl: "", password: "", confirmPassword: "", acceptTerms: false,
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const register = useServerFn(registerUser);
  const checkEmail = useServerFn(checkEmailExists);

  useEffect(() => { logAuthEventFn({ data: { eventType: "registration_form_started" } }).catch(() => {}); }, []);

  const setField = <K extends keyof RegistrationFormValues>(k: K, val: RegistrationFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    if (k === "email") setEmailExists(false);
  };

  const validate = useCallback((): RegistrationErrors => {
    const e: RegistrationErrors = {};
    const name = sanitizeText(v.companyName);
    if (!name) e.companyName = "Please enter your company or brand name";
    else if (name.length < 2) e.companyName = "Must be at least 2 characters";
    else if (name.length > 100) e.companyName = "Must be 100 characters or fewer";

    if (!v.email.trim()) e.email = "Please enter your email address";
    else if (!EMAIL_REGEX.test(v.email)) e.email = "Please enter a valid email address";
    else if (emailExists) e.email = "An account with this email already exists";

    if (!v.industry) e.industry = "Please select your industry";
    if (!v.teamSize) e.teamSize = "Please select your team size";

    if (v.websiteUrl.trim() && !/^https?:\/\//i.test(normalizeUrl(v.websiteUrl))) {
      e.websiteUrl = "Please enter a valid website URL starting with https://";
    }

    if (!v.password) e.password = "Password must be at least 8 characters";
    else if (v.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (/\s/.test(v.password)) e.password = "Password cannot contain spaces";

    if (!v.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (v.confirmPassword !== v.password) e.confirmPassword = "Passwords do not match";

    if (!v.acceptTerms) e.acceptTerms = "Please agree to the Terms of Service and Privacy Policy";

    return e;
  }, [v, emailExists]);

  const handleEmailBlur = async () => {
    if (!EMAIL_REGEX.test(v.email)) return;
    setEmailChecking(true);
    try {
      const res = await checkEmail({ data: { email: v.email } });
      setEmailExists(res.exists);
      if (res.exists) setErrors((e) => ({ ...e, email: "An account with this email already exists" }));
    } catch { /* ignore */ }
    setEmailChecking(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eobj = validate();
    if (Object.keys(eobj).length > 0) {
      setErrors(eobj);
      setShake(true);
      setTimeout(() => setShake(false), 350);
      logAuthEventFn({ data: { eventType: "registration_form_error", metadata: { fields: Object.keys(eobj) } } }).catch(() => {});
      const firstErr = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      firstErr?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        data: {
          email: v.email.trim().toLowerCase(),
          password: v.password,
          company_name: sanitizeText(v.companyName),
          industry: v.industry,
          team_size: v.teamSize,
          website_url: v.websiteUrl.trim() ? normalizeUrl(v.websiteUrl) : "",
        },
      });
      // Dispatch OTP via signInWithOtp (Magic Link template — must use {{ .Token }})
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: v.email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        // Not fatal — registration succeeded; user can use Resend
        console.warn("OTP send error", otpErr);
      }
      logAuthEventFn({
        data: {
          eventType: "registration_form_submitted",
          userId: res.user_id,
          metadata: { has_website: Boolean(v.websiteUrl), industry: v.industry, team_size: v.teamSize },
        },
      }).catch(() => {});
      toast.success("Account created", { description: "Check your inbox for the verification code." });
      onDone(v.email.trim().toLowerCase(), res.user_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong on our end. Please try again.";
      if (msg === "EMAIL_EXISTS") {
        setEmailExists(true);
        setErrors((e) => ({ ...e, email: "An account with this email already exists" }));
      } else {
        toast.error("Couldn't create your account", { description: msg });
      }
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setLoading(false);
    }
  };

  const strength = scorePassword(v.password);
  const passwordsMatch = v.confirmPassword.length > 0 && v.confirmPassword === v.password;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className={shake ? "auth-shake" : ""}>
      <header className="mb-4">
        <h2 id="auth-modal-title" className="text-[20px] font-medium">Create your free account</h2>
        <p className="text-[13px] mt-1" style={{ color: "var(--auth-text-muted)" }}>
          Takes under a minute. No credit card.
        </p>
      </header>

      <div className="space-y-4">
        <TextField
          label="Company or brand name"
          required
          autoFocus
          placeholder="Acme Corporation"
          value={v.companyName}
          onChange={(e) => setField("companyName", e.target.value)}
          error={errors.companyName}
          valid={!errors.companyName && sanitizeText(v.companyName).length >= 2}
        />
        <TextField
          label="Email"
          required
          type="email"
          placeholder="you@brand.com"
          value={v.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={handleEmailBlur}
          error={errors.email}
          valid={!errors.email && EMAIL_REGEX.test(v.email) && !emailExists && !emailChecking}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Industry"
            required
            value={v.industry}
            onChange={(val) => setField("industry", val)}
            options={INDUSTRIES}
            error={errors.industry}
          />
          <SelectField
            label="Team size"
            required
            value={v.teamSize}
            onChange={(val) => setField("teamSize", val)}
            options={TEAM_SIZES}
            error={errors.teamSize}
          />
        </div>
        <TextField
          label="Website URL"
          hint="optional"
          type="url"
          placeholder="https://acmecorp.com"
          value={v.websiteUrl}
          onChange={(e) => setField("websiteUrl", e.target.value)}
          error={errors.websiteUrl}
        />
        <PasswordField
          label="Password"
          required
          value={v.password}
          onChange={(val) => setField("password", val)}
          error={errors.password}
          showStrength
        />
        <PasswordField
          label="Confirm password"
          required
          value={v.confirmPassword}
          onChange={(val) => setField("confirmPassword", val)}
          error={errors.confirmPassword || (v.confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match" : undefined)}
        />

        <div className="flex items-start gap-2 pt-1">
          <input
            id="terms"
            type="checkbox"
            checked={v.acceptTerms}
            onChange={(e) => setField("acceptTerms", e.target.checked)}
            aria-required="true"
            className="mt-0.5"
            style={{ width: 14, height: 14, accentColor: "var(--auth-purple)" }}
          />
          <label htmlFor="terms" className="text-[13px] leading-relaxed" style={{ color: "var(--auth-text-muted)" }}>
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--auth-purple-light)" }} className="underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--auth-purple-light)" }} className="underline">Privacy Policy</a>
            <span style={{ color: "var(--auth-red)" }}> *</span>
          </label>
        </div>
        <FieldError msg={errors.acceptTerms} />

        <PrimaryButton type="submit" loading={loading} disabled={loading} className="mt-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your account…
            </span>
          ) : "Create account"}
        </PrimaryButton>
        <GhostButton type="button" onClick={onBack}>Back</GhostButton>
      </div>
    </form>
  );
}

// ============================================================
// Screen 3: Email Verification (OTP)
// ============================================================
function VerifyScreen({
  email, userId, onSuccess, onChangeEmail, startedAt,
}: { email: string; userId: string | null; onSuccess: () => void; onChangeEmail: () => void; startedAt: number }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [resending, setResending] = useState(false);
  const markVerified = useServerFn(markEmailVerified);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = useCallback(async (code: string) => {
    setLoading(true);
    setError(false);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (vErr) throw vErr;
      await markVerified({ data: { email } });
      logAuthEventFn({
        data: {
          eventType: "email_verification_success",
          userId,
          metadata: { time_to_verify_seconds: Math.round((Date.now() - startedAt) / 1000) },
        },
      }).catch(() => {});
      logAuthEventFn({ data: { eventType: "signup_completed", userId, metadata: { method: "email", plan: "starter" } } }).catch(() => {});
      onSuccess();
    } catch (e) {
      const next = attempts + 1;
      setAttempts(next);
      setError(true);
      setOtp("");
      logAuthEventFn({ data: { eventType: "email_verification_failed", metadata: { attempt_number: next } } }).catch(() => {});
      if (next >= 3) setErrMsg("Too many attempts. Please request a new code.");
      else setErrMsg("Incorrect code. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, attempts, markVerified, onSuccess, userId, startedAt]);

  // Auto-submit when complete
  useEffect(() => {
    if (otp.length === 6 && !loading && attempts < 3) {
      const t = setTimeout(() => { verify(otp); }, 300);
      return () => clearTimeout(t);
    }
  }, [otp, loading, attempts, verify]);

  const resend = async () => {
    setResending(true);
    try {
      const { error: e } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (e) throw e;
      toast.success(`Code resent to ${email}`);
      setSeconds(60);
      setAttempts(0);
      setError(false);
      setErrMsg("");
      logAuthEventFn({ data: { eventType: "email_verification_resent" } }).catch(() => {});
    } catch (err) {
      toast.error("Couldn't resend code", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setResending(false);
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="text-center">
      <div
        className="mx-auto grid place-items-center mb-4"
        style={{ width: 56, height: 56, background: "rgba(124,58,237,0.15)", borderRadius: "50%" }}
      >
        <Mail className="h-6 w-6" style={{ color: "var(--auth-purple-light)" }} />
      </div>
      <h2 id="auth-modal-title" className="text-[20px] font-medium">Check your inbox</h2>
      <p className="text-[13px] mt-2" style={{ color: "var(--auth-text-muted)" }}>We sent a 6-digit code to</p>
      <p className="text-[13px] font-medium" style={{ color: "var(--auth-purple-light)" }}>{email}</p>
      <p className="text-[13px]" style={{ color: "var(--auth-text-muted)" }}>Enter it below to verify your account.</p>

      <OTPInput value={otp} onChange={setOtp} error={error} autoFocus />
      {error && (
        <p className="text-[12px] -mt-2 mb-3" style={{ color: "var(--auth-red)" }}>{errMsg}</p>
      )}

      <PrimaryButton
        type="button"
        onClick={() => verify(otp)}
        loading={loading}
        disabled={otp.length !== 6 || attempts >= 3}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </span>
        ) : "Verify email"}
      </PrimaryButton>

      <p className="mt-4 text-[12px]" style={{ color: "var(--auth-text-muted)" }}>
        Didn't receive it?{" "}
        <button
          type="button"
          disabled={seconds > 0 || resending}
          onClick={resend}
          style={{ color: seconds > 0 ? "var(--auth-text-disabled)" : "var(--auth-purple-light)" }}
          className="underline-offset-2 hover:underline disabled:no-underline"
        >
          Resend code
        </button>
        {" · "}{fmtTime(seconds)}
      </p>

      <button
        type="button"
        onClick={onChangeEmail}
        className="mt-3 text-[13px]"
        style={{ color: "var(--auth-text-muted)" }}
      >
        Change email address
      </button>
    </div>
  );
}

// ============================================================
// Screen 4: Success
// ============================================================
function SuccessScreen({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      onClose();
      navigate({ to: DASHBOARD_PATH });
    }, 2000);
    return () => clearTimeout(t);
  }, [onClose, navigate]);

  return (
    <div
      className="text-center"
      style={{ border: "0.5px solid var(--auth-green)", borderRadius: 16, padding: "28px 24px" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        className="mx-auto grid place-items-center mb-4"
        style={{ width: 56, height: 56, background: "rgba(34,197,94,0.15)", borderRadius: "50%" }}
      >
        <CheckCircle2 className="h-6 w-6" style={{ color: "var(--auth-green)" }} />
      </motion.div>
      <h2 id="auth-modal-title" className="text-[20px] font-medium" style={{ color: "var(--auth-green)" }}>Email verified!</h2>
      <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--auth-text-muted)" }}>
        Your account is ready. Welcome to BrandSync AI — your marketing OS is waiting.
      </p>
      <PrimaryButton
        type="button"
        onClick={() => { onClose(); navigate({ to: DASHBOARD_PATH }); }}
        className="mt-5"
      >
        Enter dashboard →
      </PrimaryButton>
    </div>
  );
}

// ============================================================
// Screen 5/6: Login
// ============================================================
function LoginScreen({
  onBack, onForgot, onSuccess, onGoogleDone,
}: { onBack: () => void; onForgot: () => void; onSuccess: () => void; onGoogleDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntilMs, setLockedUntilMs] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const recordFailure = useServerFn(recordLoginFailure);
  const clearAttempts = useServerFn(clearLoginAttempts);
  const checkLock = useServerFn(checkLoginLockout);

  useEffect(() => {
    if (!lockedUntilMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedUntilMs]);

  const locked = lockedUntilMs !== null && lockedUntilMs > now;
  const lockRemaining = locked ? Math.max(0, lockedUntilMs! - now) : 0;
  const fmtLock = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    logAuthEventFn({ data: { eventType: "login_attempted", metadata: { method: "google" } } }).catch(() => {});
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: result.error.message });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      onGoogleDone();
      navigate({ to: DASHBOARD_PATH });
    } catch (e) {
      toast.error("Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eobj: typeof errors = {};
    if (!email.trim()) eobj.email = "Please enter your email address";
    else if (!EMAIL_REGEX.test(email)) eobj.email = "Please enter a valid email address";
    if (!password) eobj.password = "Please enter your password";
    if (Object.keys(eobj).length) { setErrors(eobj); return; }
    setErrors({});
    setServerError(null);

    // Check lock first
    try {
      const lockRes = await checkLock({ data: { email: email.toLowerCase() } });
      if (lockRes.locked && lockRes.lockedUntilMs) {
        setLockedUntilMs(lockRes.lockedUntilMs);
        return;
      }
    } catch { /* continue */ }

    setLoading(true);
    logAuthEventFn({ data: { eventType: "login_attempted", metadata: { method: "email" } } }).catch(() => {});
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
      if (error) throw error;
      await clearAttempts({ data: { email: email.toLowerCase() } });
      logAuthEventFn({
        data: { eventType: "login_success", userId: data.user?.id ?? null, metadata: { remember_me: remember } },
      }).catch(() => {});
      toast.success("Welcome back!");
      onSuccess();
      navigate({ to: DASHBOARD_PATH });
    } catch (err) {
      const res = await recordFailure({ data: { email: email.toLowerCase() } }).catch(() => null);
      setServerError("Incorrect email or password. Please try again.");
      setAttemptsLeft(res?.attemptsRemaining ?? null);
      if (res?.lockedUntilMs) setLockedUntilMs(res.lockedUntilMs);
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={shake ? "auth-shake" : ""}>
      <header className="mb-4">
        <h2 id="auth-modal-title" className="text-[20px] font-medium">Log in</h2>
        <p className="text-[13px] mt-1" style={{ color: "var(--auth-text-muted)" }}>Access your BrandSync workspace.</p>
      </header>

      <div className="space-y-3">
        <GoogleOAuthButton onClick={handleGoogle} loading={googleLoading} />
        <AuthDivider />

        <TextField
          label="Email"
          required
          type="email"
          autoFocus
          placeholder="you@brand.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setServerError(null); }}
          error={errors.email || (serverError ? " " : undefined)}
        />
        <PasswordField
          label="Password"
          required
          value={password}
          onChange={(val) => { setPassword(val); setServerError(null); }}
          error={errors.password || (serverError ? " " : undefined)}
          autoComplete="current-password"
        />

        {serverError && (
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "0.5px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
            }}
            role="alert"
          >
            <AlertCircle className="h-4 w-4" style={{ color: "var(--auth-red)" }} />
            <span className="text-[13px]" style={{ color: "var(--auth-red)" }}>{serverError}</span>
          </div>
        )}

        {locked && (
          <p className="text-[12px] text-center" style={{ color: "var(--auth-red)" }}>
            Account temporarily locked. Try again in {fmtLock(lockRemaining)}.
          </p>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--auth-text-muted)" }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: "var(--auth-purple)" }}
            />
            Keep me logged in for 30 days
          </label>
          <button
            type="button"
            onClick={onForgot}
            className="text-[13px]"
            style={{ color: "var(--auth-purple-light)" }}
          >
            {serverError ? "Reset it here" : "Forgot password?"}
          </button>
        </div>

        <PrimaryButton type="submit" loading={loading} disabled={loading || locked}>
          {loading ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Logging in…
            </span>
          ) : serverError ? "Try again" : "Log in"}
        </PrimaryButton>

        {attemptsLeft !== null && attemptsLeft > 0 && !locked && (
          <p className="text-[11px] text-center" style={{ color: "var(--auth-text-disabled)" }}>
            {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining before temporary lockout
          </p>
        )}

        <GhostButton type="button" onClick={onBack}>Back</GhostButton>
      </div>
    </form>
  );
}

// ============================================================
// Screen 7: Forgot password
// ============================================================
function ForgotScreen({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const reqReset = useServerFn(requestPasswordReset);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setErr("Please enter a valid email address");
      return;
    }
    setErr(undefined);
    setLoading(true);
    try {
      await reqReset({ data: { email: email.toLowerCase() } });
      toast.success("If an account exists, a reset code is on the way");
      onSent(email.toLowerCase());
    } catch {
      toast.success("If an account exists, a reset code is on the way");
      onSent(email.toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <header className="mb-4">
        <h2 id="auth-modal-title" className="text-[20px] font-medium flex items-center gap-2">
          <LockOpen className="h-5 w-5" style={{ color: "var(--auth-purple-light)" }} />
          Reset your password
        </h2>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--auth-text-muted)" }}>
          Enter the email address on your account and we will send you a reset code.
        </p>
      </header>
      <div className="space-y-3">
        <TextField
          label="Email address"
          required
          type="email"
          autoFocus
          placeholder="you@brand.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={err}
        />
        <PrimaryButton type="submit" loading={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </span>
          ) : "Send reset code"}
        </PrimaryButton>
        <GhostButton type="button" onClick={onBack}>Back to log in</GhostButton>
      </div>
    </form>
  );
}

// ============================================================
// Reset-verify (OTP for recovery)
// ============================================================
function ResetVerifyScreen({
  email, onVerified, onBack,
}: { email: string; onVerified: () => void; onBack: () => void }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const reqReset = useServerFn(requestPasswordReset);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = useCallback(async (code: string) => {
    setLoading(true);
    setError(false);
    try {
      const { error: e } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
      if (e) throw e;
      onVerified();
    } catch (e) {
      setError(true);
      setErrMsg("Incorrect code. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  }, [email, onVerified]);

  useEffect(() => {
    if (otp.length === 6 && !loading) {
      const t = setTimeout(() => verify(otp), 300);
      return () => clearTimeout(t);
    }
  }, [otp, loading, verify]);

  const resend = async () => {
    await reqReset({ data: { email } }).catch(() => {});
    setSeconds(60);
    setOtp("");
    setError(false);
    toast.success(`Code resent to ${email}`);
  };

  return (
    <div className="text-center">
      <div className="mx-auto grid place-items-center mb-4"
        style={{ width: 56, height: 56, background: "rgba(124,58,237,0.15)", borderRadius: "50%" }}>
        <Mail className="h-6 w-6" style={{ color: "var(--auth-purple-light)" }} />
      </div>
      <h2 id="auth-modal-title" className="text-[20px] font-medium">Enter your reset code</h2>
      <p className="text-[13px] mt-2" style={{ color: "var(--auth-text-muted)" }}>
        We sent a 6-digit code to{" "}
        <span style={{ color: "var(--auth-purple-light)" }}>{email}</span>
      </p>
      <OTPInput value={otp} onChange={setOtp} error={error} autoFocus />
      {error && <p className="text-[12px] -mt-2 mb-3" style={{ color: "var(--auth-red)" }}>{errMsg}</p>}
      <PrimaryButton type="button" onClick={() => verify(otp)} loading={loading} disabled={otp.length !== 6}>
        {loading ? "Verifying…" : "Verify code"}
      </PrimaryButton>
      <p className="mt-4 text-[12px]" style={{ color: "var(--auth-text-muted)" }}>
        Didn't receive it?{" "}
        <button
          type="button"
          disabled={seconds > 0}
          onClick={resend}
          style={{ color: seconds > 0 ? "var(--auth-text-disabled)" : "var(--auth-purple-light)" }}
        >
          Resend code
        </button>
        {" · "}{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
      </p>
      <button type="button" onClick={onBack} className="mt-3 text-[13px]" style={{ color: "var(--auth-text-muted)" }}>
        Back
      </button>
    </div>
  );
}

// ============================================================
// Screen 8: Set new password
// ============================================================
function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const match = useMemo(() => confirm.length > 0 && confirm === pw, [pw, confirm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (pw.length < 8) er.pw = "Password must be at least 8 characters";
    if (confirm !== pw) er.confirm = "Passwords do not match";
    if (Object.keys(er).length) { setErrors(er); return; }
    setErrors({});
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      logAuthEventFn({ data: { eventType: "password_reset_completed", userId: data.user?.id ?? null } }).catch(() => {});
      toast.success("Password updated successfully");
      setTimeout(() => { onDone(); navigate({ to: DASHBOARD_PATH }); }, 1000);
    } catch (e) {
      toast.error("Couldn't update password", { description: e instanceof Error ? e.message : undefined });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <header className="mb-4">
        <h2 id="auth-modal-title" className="text-[20px] font-medium flex items-center gap-2">
          <KeyRound className="h-5 w-5" style={{ color: "var(--auth-purple-light)" }} />
          Set new password
        </h2>
        <p className="text-[13px] mt-1" style={{ color: "var(--auth-text-muted)" }}>Choose a strong password for your account.</p>
      </header>
      <div className="space-y-3">
        <PasswordField label="New password" required value={pw} onChange={setPw} error={errors.pw} showStrength />
        <PasswordField
          label="Confirm new password"
          required
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm || (confirm.length > 0 && !match ? "Passwords do not match" : undefined)}
        />
        {match && (
          <p className="text-[12px]" style={{ color: "var(--auth-green)" }}>Passwords match</p>
        )}
        <PasswordRequirements value={pw} />
        <PrimaryButton type="submit" loading={loading}>
          {loading ? "Saving…" : "Save new password"}
        </PrimaryButton>
      </div>
    </form>
  );
}
