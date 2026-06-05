import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { scorePassword } from "@/utils/passwordScorer";
import type { PasswordStrength } from "@/types/auth";

const inputBase: React.CSSProperties = {
  background: "var(--auth-bg-input)",
  border: "0.5px solid var(--auth-border)",
  borderRadius: 8,
  padding: "11px 40px 11px 14px",
  color: "var(--auth-text-primary)",
  fontSize: 14,
  width: "100%",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  outline: "none",
};

export function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="block mb-1.5 text-[13px]" style={{ color: "var(--auth-text-primary)" }}>
      {children}
      {required && <span style={{ color: "var(--auth-red)" }}> *</span>}
      {hint && <span className="ml-1 text-[12px]" style={{ color: "var(--auth-text-disabled)" }}>({hint})</span>}
    </label>
  );
}

export function FieldError({ id, msg }: { id?: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" aria-live="polite" className="mt-1 text-[12px]" style={{ color: "var(--auth-red)" }}>
      {msg}
    </p>
  );
}

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  valid?: boolean;
  rightAdornment?: React.ReactNode;
}

export function TextField({ label, required, hint, error, valid, rightAdornment, id, ...props }: TextFieldProps) {
  const inputId = id ?? `f-${Math.random().toString(36).slice(2, 8)}`;
  const errId = `${inputId}-err`;
  const borderColor = error
    ? "var(--auth-red)"
    : valid
      ? "var(--auth-green)"
      : "var(--auth-border)";
  return (
    <div>
      <Label required={required} hint={hint}>{label}</Label>
      <div className="relative">
        <input
          id={inputId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          {...props}
          style={{ ...inputBase, borderColor, boxShadow: error ? "none" : undefined }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.boxShadow = "0 0 0 2px var(--auth-purple-glow)";
            if (!error && !valid) e.currentTarget.style.borderColor = "var(--auth-purple)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = borderColor;
            props.onBlur?.(e);
          }}
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none gap-1">
          {valid && !error && <Check className="h-4 w-4" style={{ color: "var(--auth-green)" }} />}
          {error && <AlertCircle className="h-4 w-4" style={{ color: "var(--auth-red)" }} />}
        </div>
        {rightAdornment && <div className="absolute inset-y-0 right-2 flex items-center">{rightAdornment}</div>}
      </div>
      <FieldError id={errId} msg={error} />
    </div>
  );
}

export function SelectField({
  label, required, error, value, onChange, options, placeholder, id,
}: {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  id?: string;
}) {
  const inputId = id ?? `s-${Math.random().toString(36).slice(2, 8)}`;
  const borderColor = error ? "var(--auth-red)" : value ? "var(--auth-green)" : "var(--auth-border)";
  return (
    <div>
      <Label required={required}>{label}</Label>
      <select
        id={inputId}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputBase,
          padding: "10px 12px",
          borderColor,
          appearance: "auto",
        }}
      >
        <option value="" disabled>{placeholder ?? "Select"}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <FieldError msg={error} />
    </div>
  );
}

export function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  const segs = [1, 2, 3, 4];
  return (
    <div className="mt-2" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4} aria-label={`Password strength: ${strength.label || "none"}`}>
      <div className="flex gap-1">
        {segs.map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-sm"
            style={{ background: i <= strength.score ? strength.color : "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>
      {strength.label && (
        <p className="mt-1 text-[12px]" style={{ color: strength.color }}>
          {strength.label}
        </p>
      )}
    </div>
  );
}

export function PasswordField({
  label, required, value, onChange, error, placeholder, showStrength, autoComplete, onBlur,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  showStrength?: boolean;
  autoComplete?: string;
  onBlur?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const strength = scorePassword(value);
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? "Min 8 characters"}
          autoComplete={autoComplete ?? "new-password"}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          style={{
            ...inputBase,
            paddingRight: 44,
            borderColor: error ? "var(--auth-red)" : "var(--auth-border)",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 -translate-y-1/2 right-2 grid place-items-center"
          style={{ width: 36, height: 36, color: "var(--auth-text-muted)" }}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value.length > 0 && <PasswordStrengthMeter strength={strength} />}
      <FieldError msg={error} />
    </div>
  );
}

export function PasswordRequirements({ value }: { value: string }) {
  const s = scorePassword(value);
  const items = [
    { ok: s.hasMinLength, text: "At least 8 characters" },
    { ok: s.hasUppercase, text: "One uppercase letter" },
    { ok: s.hasNumber, text: "One number" },
    { ok: s.hasSpecial, text: "One special character (optional)", optional: true },
  ];
  return (
    <div
      className="rounded-lg px-3.5 py-3 mt-1 text-[12px]"
      style={{
        background: "rgba(124,58,237,0.06)",
        border: "0.5px solid rgba(124,58,237,0.2)",
      }}
    >
      <p className="font-medium mb-1.5" style={{ color: "var(--auth-purple-light)" }}>Password requirements</p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li
            key={it.text}
            style={{ color: it.optional ? "var(--auth-text-disabled)" : it.ok ? "var(--auth-green)" : "var(--auth-text-disabled)" }}
          >
            <span className="mr-1.5">{it.optional ? "○" : "✓"}</span>{it.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OTPInput({
  value, onChange, error, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (i: number, d: string) => {
    const arr = digits.slice();
    arr[i] = d;
    onChange(arr.join("").replace(/ /g, ""));
  };

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-1);
    setDigit(i, raw);
    if (raw && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    onChange(txt);
    const last = Math.min(txt.length, 6) - 1;
    inputsRef.current[last]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center my-5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          aria-label={`Digit ${i + 1} of 6`}
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          onPaste={handlePaste}
          className="text-center font-medium"
          style={{
            width: 44,
            height: 52,
            background: "var(--auth-bg-input)",
            border: `0.5px solid ${error ? "var(--auth-red)" : d.trim() ? "var(--auth-purple)" : "var(--auth-border)"}`,
            borderRadius: 8,
            fontSize: 20,
            color: "var(--auth-text-primary)",
            outline: "none",
            boxShadow: d.trim() && !error ? "0 0 0 2px var(--auth-purple-glow)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export function GoogleOAuthButton({
  onClick, loading, label = "Continue with Google",
}: { onClick: () => void; loading?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2.5 h-11 disabled:opacity-60 transition-colors"
      style={{ background: "#FFFFFF", border: "0.5px solid #E2E8F0", borderRadius: 10, color: "#1A1A2E", fontWeight: 500, fontSize: 14 }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
      </svg>
      {label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div
      className="text-center text-[12px] uppercase tracking-widest my-3.5"
      style={{ color: "var(--auth-text-disabled)" }}
    >
      — or —
    </div>
  );
}

export function PrimaryButton({
  children, loading, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
      className={`w-full transition-all ${props.className ?? ""}`}
      style={{
        background: "var(--auth-purple)",
        color: "white",
        borderRadius: 10,
        padding: 13,
        fontSize: 14,
        fontWeight: 500,
        opacity: loading || props.disabled ? 0.8 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full ${props.className ?? ""}`}
      style={{
        background: "transparent",
        border: "0.5px solid var(--auth-border)",
        color: "var(--auth-text-muted)",
        borderRadius: 10,
        padding: 11,
        fontSize: 14,
      }}
    />
  );
}
