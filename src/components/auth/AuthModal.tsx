import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Mail, CheckCircle2, KeyRound, LockOpen, AlertCircle, AlertTriangle, Loader2, Check, ShieldCheck, RefreshCw, Pencil, HelpCircle, Clock } from "lucide-react";
import { useEmailVerificationDetection } from "@/hooks/useEmailVerificationDetection";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  Label, FieldError, TextField, SelectField, PasswordField, PasswordRequirements,
  OTPInput, GoogleOAuthButton, AuthDivider, PrimaryButton, GhostButton,
} from "@/components/auth/shared";
import { scorePassword } from "@/utils/passwordScorer";
import { EMAIL_REGEX, normalizeUrl, sanitizeText } from "@/utils/validators";
import {
  registerUser, recordLoginFailure, clearLoginAttempts,
  checkLoginLockout, markEmailVerified, requestPasswordReset, logAuthEventFn,
} from "@/lib/auth-flow.functions";
import { useEmailValidation, type EmailState } from "@/hooks/useEmailValidation";
import { INDUSTRIES, TEAM_SIZES, type AuthScreen, type AuthTab, type RegistrationErrors, type RegistrationFormValues } from "@/types/auth";

// ============================================================
// EmailField — strict validation + typo detection
// ============================================================
interface EmailFieldProps {
  value: string;
  state: EmailState;
  error: string | null;
  typoSuggestion: { suggested: string; domain: string } | null;
  isCheckingDuplicate: boolean;
  duplicateExists: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onAcceptTypo: () => void;
  onDismissTypo: () => void;
  onLoginWithEmail?: () => void;
}

function EmailField(props: EmailFieldProps) {
  const { value, state, error, typoSuggestion, isCheckingDuplicate, onChange, onBlur, onPaste, onAcceptTypo, onDismissTypo, onLoginWithEmail } = props;
  let borderColor = "var(--auth-border)";
  let boxShadow: string | undefined;
  if (state === "invalid") borderColor = "#EF4444";
  else if (state === "typo_warning") { borderColor = "#F59E0B"; boxShadow = "0 0 0 2px rgba(245,158,11,0.15)"; }
  else if (state === "valid") borderColor = "#22C55E";
  else if (state === "checking") { borderColor = "#7C3AED"; boxShadow = "0 0 0 2px rgba(124,58,237,0.12)"; }
  else if (state === "typing") { borderColor = "#7C3AED"; boxShadow = "0 0 0 2px rgba(124,58,237,0.2)"; }

  const isChecking = isCheckingDuplicate || state === "checking";


  const showLoginLink = state === "invalid" && /already exists/i.test(error ?? "");

  return (
    <div>
      <Label required>Email</Label>
      <div className="relative">
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          placeholder="you@brand.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={onPaste}
          aria-required="true"
          aria-invalid={state === "invalid" || state === "typo_warning"}
          aria-describedby={error || typoSuggestion ? "email-error" : undefined}
          style={{
            background: "var(--auth-bg-input)",
            border: `0.5px solid ${borderColor}`,
            borderRadius: 8,
            padding: "11px 40px 11px 14px",
            color: "var(--auth-text-primary)",
            fontSize: 14,
            width: "100%",
            outline: "none",
            boxShadow,
            transition: "border-color 150ms ease, box-shadow 150ms ease",
          }}
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          {isChecking && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#94A3B8" }} />}
          {!isChecking && state === "valid" && <Check className="h-4 w-4" style={{ color: "#22C55E" }} />}
          {!isChecking && state === "invalid" && <AlertCircle className="h-4 w-4" style={{ color: "#EF4444" }} />}
          {!isChecking && state === "typo_warning" && <AlertTriangle className="h-4 w-4" style={{ color: "#F59E0B" }} />}
        </div>
      </div>

      {isChecking && (
        <p className="mt-1 text-[11px]" style={{ color: "#64748B" }}>
          {state === "checking" ? "Verifying email address…" : "Checking availability…"}
        </p>
      )}


      {error && !typoSuggestion && (
        <div id="email-error" role="alert" aria-live="polite" aria-atomic="true" className="mt-1 text-[12px]" style={{ color: "#EF4444" }}>
          {error}
          {showLoginLink && onLoginWithEmail && (
            <>
              {" "}
              <button type="button" onClick={onLoginWithEmail} className="underline" style={{ color: "#A78BFA" }}>
                Log in instead?
              </button>
            </>
          )}
        </div>
      )}

      {typoSuggestion && (
        <div
          id="email-error"
          role="status"
          aria-live="polite"
          className="mt-1"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "0.5px solid rgba(245,158,11,0.25)",
            borderRadius: 6,
            padding: "8px 12px",
          }}
        >
          <div className="text-[12px] font-medium" style={{ color: "#F59E0B" }}>
            Did you mean {typoSuggestion.suggested}?
          </div>
          <button
            type="button"
            onClick={onAcceptTypo}
            aria-label={`Use suggested email ${typoSuggestion.suggested}`}
            className="text-[12px] underline mt-0.5"
            style={{ color: "#A78BFA", cursor: "pointer" }}
          >
            Use {typoSuggestion.suggested}
          </button>
          <div>
            <button
              type="button"
              onClick={onDismissTypo}
              aria-label="Keep my email address as entered"
              className="text-[11px] mt-1"
              style={{ color: "#64748B", cursor: "pointer" }}
            >
              No, my email is correct →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AuthModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab?: AuthTab;
}

const DASHBOARD_PATH = "/dashboard/intelligence";
const POST_AUTH_REDIRECT_KEY = "brandsync_post_auth_redirect";

export function AuthModal({ open, onOpenChange, initialTab = "signup" }: AuthModalProps) {
  const [screen, setScreen] = useState<AuthScreen>(initialTab === "login" ? "login" : "entry");
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const startTimeRef = useRef<number>(Date.now());
  const navigate = useNavigate();

  // Reset on open + bounce already-logged-in users
  useEffect(() => {
    if (!open) return;
    setScreen(initialTab === "login" ? "login" : "entry");
    setTab(initialTab);
    startTimeRef.current = Date.now();
    logAuthEventFn({ data: { eventType: "modal_opened", metadata: { source: "direct" } } }).catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u && u.email_confirmed_at) {
        onOpenChange(false);
        navigate({ to: DASHBOARD_PATH });
      }
    }).catch(() => {});
  }, [open, initialTab, onOpenChange, navigate]);

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
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
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
      localStorage.setItem(POST_AUTH_REDIRECT_KEY, DASHBOARD_PATH);
      logAuthEventFn({ data: { eventType: "signup_method_selected", metadata: { method: "google" } } }).catch(() => {});
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        toast.error("Google sign-in failed", { description: result.error.message });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      toast.success("Welcome to BrandSync AI!");
      onGoogleDone();
      navigate({ to: DASHBOARD_PATH });
    } catch (e) {
      localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
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
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const register = useServerFn(registerUser);

  const email = useEmailValidation();

  useEffect(() => { logAuthEventFn({ data: { eventType: "registration_form_started" } }).catch(() => {}); }, []);

  const setField = <K extends keyof RegistrationFormValues>(k: K, val: RegistrationFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validateOther = useCallback((): RegistrationErrors => {
    const e: RegistrationErrors = {};
    const name = sanitizeText(v.companyName);
    if (!name) e.companyName = "Please enter your company or brand name";
    else if (name.length < 2) e.companyName = "Must be at least 2 characters";
    else if (name.length > 100) e.companyName = "Must be 100 characters or fewer";

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
  }, [v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eobj = validateOther();
    const emailOk = email.forceValidate();
    if (!emailOk || Object.keys(eobj).length > 0) {
      setErrors(eobj);
      setShake(true);
      setTimeout(() => setShake(false), 350);
      logAuthEventFn({ data: { eventType: "registration_form_error", metadata: { fields: [...Object.keys(eobj), ...(emailOk ? [] : ["email"])] } } }).catch(() => {});
      if (!emailOk) {
        emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        emailRef.current?.querySelector<HTMLInputElement>("input#email")?.focus();
      } else {
        const firstErr = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
        firstErr?.focus();
      }
      return;
    }
    setLoading(true);
    const normalizedEmail = email.emailValue.trim().toLowerCase();
    try {
      const res = await register({
        data: {
          email: normalizedEmail,
          password: v.password,
          company_name: sanitizeText(v.companyName),
          industry: v.industry,
          team_size: v.teamSize,
          website_url: v.websiteUrl.trim() ? normalizeUrl(v.websiteUrl) : "",
        },
      });
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpErr) console.warn("OTP send error", otpErr);
      logAuthEventFn({
        data: {
          eventType: "registration_form_submitted",
          userId: res.user_id,
          metadata: { has_website: Boolean(v.websiteUrl), industry: v.industry, team_size: v.teamSize },
        },
      }).catch(() => {});
      toast.success("Account created", { description: "Check your inbox for the verification code." });
      onDone(normalizedEmail, res.user_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong on our end. Please try again.";
      if (msg === "EMAIL_EXISTS" || msg === "email_exists") {
        setErrors((er) => ({ ...er, email: "An account with this email already exists" }));
      } else if (msg === "disposable_email") {
        setErrors((er) => ({ ...er, email: "Please use a permanent email address to create your account" }));
      } else if (msg === "invalid_email_format" || msg === "email_too_long") {
        setErrors((er) => ({ ...er, email: "Please enter a valid email address" }));
      } else if (msg === "undeliverable_email") {
        setErrors((er) => ({ ...er, email: "This email domain doesn't exist or can't receive mail. Please check the spelling." }));

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
  const otherFieldsValid =
    sanitizeText(v.companyName).length >= 2 &&
    Boolean(v.industry) &&
    Boolean(v.teamSize) &&
    v.password.length >= 8 &&
    passwordsMatch &&
    v.acceptTerms;
  const canSubmit = email.isEmailValid && otherFieldsValid && !loading;


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
        <div ref={emailRef}>
          <EmailField
            value={email.emailValue}
            state={email.emailState}
            error={email.emailError}
            typoSuggestion={email.emailTypoSuggestion}
            isCheckingDuplicate={email.isCheckingDuplicate}
            duplicateExists={email.duplicateExists}
            onChange={email.handleEmailChange}
            onBlur={email.handleEmailBlur}
            onPaste={email.handleEmailPaste}
            onAcceptTypo={email.acceptTypoSuggestion}
            onDismissTypo={email.dismissTypoWarning}
          />
          {errors.email && !email.emailError && (
            <p role="alert" className="mt-1 text-[12px]" style={{ color: "#EF4444" }}>{errors.email}</p>
          )}
        </div>
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

        <PrimaryButton type="submit" loading={loading} disabled={!canSubmit} className="mt-2">
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
// Screen 3: Email Verification (Link)
// ============================================================
function VerifyScreen({
  email, userId, onChangeEmail,
}: { email: string; userId: string | null; onSuccess: () => void; onChangeEmail: () => void; startedAt: number }) {
  const [seconds, setSeconds] = useState(45);
  const [resending, setResending] = useState(false);
  const { pollingTimedOut } = useEmailVerificationDetection({
    userId,
    email,
    enabled: true,
  });

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const resend = async () => {
    if (seconds > 0 || resending) return;
    setResending(true);
    try {
      const { error: e } = await supabase.auth.resend({ type: "signup", email });
      if (e) throw e;
      toast.success(`Verification email resent to ${email}`);
      setSeconds(45);
      logAuthEventFn({ data: { eventType: "email_verification_resent", userId } }).catch(() => {});
    } catch (err) {
      toast.error("Couldn't resend email", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setResending(false);
    }
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const purple = "var(--auth-purple-light)";
  const muted = "var(--auth-text-muted)";

  return (
    <div className="text-center">
      {/* 1. Icon */}
      <div
        className="mx-auto grid place-items-center mb-5"
        style={{ width: 72, height: 72, border: "1.5px solid var(--auth-purple-light)", borderRadius: "50%", background: "transparent" }}
      >
        <Mail className="h-7 w-7" style={{ color: purple }} />
      </div>

      {/* 2. Headline */}
      <h2 id="auth-modal-title" className="text-[24px] font-bold leading-tight">Check your inbox</h2>

      {/* 3. Subtitle */}
      <p className="text-[14px] mt-3" style={{ color: muted }}>We've sent a verification link to</p>

      {/* 4. Email pill */}
      <div className="mt-2 flex justify-center">
        <span
          className="inline-flex items-center px-4 py-1.5 rounded-full text-[13px] font-medium"
          style={{
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.45)",
            color: purple,
          }}
        >
          {email}
        </span>
      </div>

      {/* 5. Instruction steps card */}
      <div
        className="mt-5 rounded-2xl p-4 text-left"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--auth-border)" }}
      >
        {[
          { p: <>Open the email from BrandSync AI</>, s: <>Subject: &ldquo;Confirm your signup&rdquo;</> },
          { p: <>Click the <span className="font-bold">&ldquo;Verify Email&rdquo;</span> button inside</>, s: <>Link expires in 24 hours</> },
          { p: <>You'll be redirected to your dashboard automatically</>, s: <>No code entry required</> },
        ].map((step, i, arr) => (
          <div key={i}>
            <div className="flex items-start gap-3 py-2">
              <div
                className="shrink-0 grid place-items-center rounded-full text-[12px] font-semibold mt-0.5"
                style={{ width: 24, height: 24, background: "rgba(124,58,237,0.15)", color: purple }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold leading-snug">{step.p}</p>
                <p className="text-[12.5px] mt-0.5" style={{ color: muted }}>{step.s}</p>
              </div>
            </div>
            {i < arr.length - 1 && <div style={{ height: 1, background: "var(--auth-border)" }} />}
          </div>
        ))}
      </div>

      {/* 6. Activation banner */}
      <div
        className="mt-4 rounded-xl px-3 py-3 flex items-start gap-2.5 text-left"
        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}
      >
        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
        <p className="text-[13px] leading-snug" style={{ color: "#10B981" }}>
          Once verified, your BrandSync AI account will be fully activated
        </p>
      </div>

      {/* 7. Resend timer line */}
      <div className="mt-5" style={{ borderTop: "1px solid var(--auth-border)" }} />
      {seconds > 0 && (
        <p className="text-[12.5px] mt-3" style={{ color: muted }}>
          Resend available in {fmtTime(seconds)}
        </p>
      )}

      {/* 8. Resend button */}
      {(() => {
        const isDisabled = seconds > 0 || resending;
        return (
          <button
            type="button"
            onClick={resend}
            disabled={isDisabled}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium transition"
            style={{
              background: isDisabled ? "transparent" : "rgba(124,58,237,0.12)",
              border: `1px solid ${isDisabled ? "var(--auth-border)" : "rgba(124,58,237,0.55)"}`,
              color: isDisabled ? "var(--auth-text)" : purple,
              opacity: isDisabled ? 0.4 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
            }}
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Resend verification email
          </button>
        );
      })()}

      {pollingTimedOut && (
        <div
          className="mt-3 flex items-start gap-2 text-left"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "0.5px solid rgba(245,158,11,0.25)",
            borderRadius: 8,
            padding: "12px 14px",
          }}
        >
          <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
          <p className="text-[12px] leading-[1.5]" style={{ color: "#F59E0B" }}>
            Still waiting for verification. Check your spam folder or request a new link.
          </p>
        </div>
      )}

      {/* 9. Change email button */}
      <button
        type="button"
        onClick={onChangeEmail}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium"
        style={{ background: "transparent", border: "1px solid var(--auth-border)", color: "var(--auth-text)" }}
      >
        <Pencil className="h-4 w-4" />
        Change email address
      </button>

      {/* 10. Footer help */}
      <div className="mt-5" style={{ borderTop: "1px solid var(--auth-border)" }} />
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[13px]" style={{ color: muted }}>
        <HelpCircle className="h-4 w-4" />
        <span>Didn't get the email?</span>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="font-medium hover:underline"
          style={{ color: purple }}
        >
          Check spam folder
        </a>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug" style={{ color: muted }}>
        Sometimes verification emails land in spam.<br />
        Check your spam or junk folder if you don't see it.
      </p>
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
