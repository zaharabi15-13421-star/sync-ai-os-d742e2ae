import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2 } from "lucide-react";

export function BrandDetailsModal({
  isOpen, onClose, title, subtitle, children, onApply, isApplying, error,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onApply: () => void;
  isApplying: boolean;
  error?: string | null;
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleApply = async () => {
    try {
      await Promise.resolve(onApply());
      setSavedFlash(true);
      setTimeout(() => { setSavedFlash(false); onClose(); }, 1200);
    } catch {/* error rendered by parent */}
  };

  if (!isOpen) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bd-modal-title"
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col"
        style={{
          background: "var(--auth-bg-modal, #1A1A2E)",
          border: "0.5px solid #2D2D4E",
          borderRadius: 16,
          padding: "28px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-[var(--auth-text-muted)] hover:text-[var(--auth-text-primary)] transition"
          style={{ color: "#94A3B8" }}
        >
          <X size={16} />
        </button>
        <div className="mb-5 pr-8">
          <h2 id="bd-modal-title" className="text-[18px] font-semibold" style={{ color: "#E2E8F0" }}>{title}</h2>
          {subtitle && <p className="text-[13px] mt-1" style={{ color: "#94A3B8" }}>{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-y-auto -mx-1 px-1 bd-scroll">{children}</div>
        {error && <div className="mt-3 text-[12px]" style={{ color: "#EF4444" }}>{error}</div>}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleApply}
            disabled={isApplying || savedFlash}
            className="inline-flex items-center gap-2 text-white text-[14px] font-medium rounded-[10px] px-6 py-[10px] transition disabled:opacity-80"
            style={{ background: "#7C3AED" }}
          >
            {savedFlash ? (<><Check size={14} /> Saved!</>)
              : isApplying ? (<><Loader2 size={14} className="animate-spin" /> Saving…</>)
              : "Apply"}
          </button>
        </div>
      </div>
      <style>{`
        .bd-scroll::-webkit-scrollbar { width: 4px; }
        .bd-scroll::-webkit-scrollbar-track { background: transparent; }
        .bd-scroll::-webkit-scrollbar-thumb { background: #1E1E35; border-radius: 4px; }
        .bd-scroll::-webkit-scrollbar-thumb:hover { background: #7C3AED; }
      `}</style>
    </div>,
    document.body,
  );
}

export const inputBase: React.CSSProperties = {
  background: "#080814",
  border: "0.5px solid #1E1E35",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 14,
  color: "#E2E8F0",
  width: "100%",
  outline: "none",
  transition: "150ms ease",
};

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputBase, ...(props.style || {}) }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.2)"; props.onFocus?.(e); }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#1E1E35"; e.currentTarget.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputBase, resize: "vertical", minHeight: 80, ...(props.style || {}) }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.2)"; props.onFocus?.(e); }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#1E1E35"; e.currentTarget.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
  );
}

export function Checkbox({ checked, onChange, label, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; label?: string; ariaLabel?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }}
        onClick={() => onChange(!checked)}
        className="inline-flex items-center justify-center"
        style={{
          width: 16, height: 16, borderRadius: 4,
          background: checked ? "#7C3AED" : "#080814",
          border: `0.5px solid ${checked ? "#7C3AED" : "#1E1E35"}`,
          transition: "150ms ease",
        }}
      >
        {checked && <Check size={11} color="#fff" strokeWidth={3} />}
      </span>
      {label && <span className="text-[14px]" style={{ color: "#E2E8F0" }}>{label}</span>}
    </label>
  );
}
