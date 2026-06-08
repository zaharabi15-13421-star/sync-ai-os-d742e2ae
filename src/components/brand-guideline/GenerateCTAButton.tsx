import { Sparkles, Loader2 } from "lucide-react";
import { formatLabel, type GuidelineFormat } from "./FormatSelector";

export function GenerateCTAButton({
  format,
  disabled,
  loading,
  disabledReason,
  onClick,
}: {
  format: GuidelineFormat;
  disabled?: boolean;
  loading?: boolean;
  disabledReason?: string;
  onClick: () => void;
}) {
  const isOff = disabled || loading;

  return (
    <div className="w-full">
      <style>{`
        @keyframes bgg-gradient-shift {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        @keyframes bgg-glitch-clip {
          0%, 90%, 100% { clip-path: inset(0 0 100% 0); opacity: 0; }
          92% { clip-path: inset(20% 0 60% 0); opacity: 0.4; transform: translateX(-4px); }
          94% { clip-path: inset(50% 0 30% 0); opacity: 0.4; transform: translateX(4px); }
          96% { clip-path: inset(10% 0 80% 0); opacity: 0.4; transform: translateX(-2px); }
          98% { clip-path: inset(60% 0 10% 0); opacity: 0.3; transform: translateX(2px); }
        }
        @keyframes bgg-color-flicker {
          0%, 85%, 100% { opacity: 0; }
          87% { opacity: 0.15; background: rgba(168,85,247,0.5); }
          89% { opacity: 0; }
          91% { opacity: 0.1; background: rgba(124,58,237,0.3); }
        }
        @keyframes bgg-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.4), 0 0 40px rgba(124,58,237,0.15); }
          50% { box-shadow: 0 0 30px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.25); }
        }
        .bgg-cta {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #7C3AED, #A855F7, #7C3AED);
          background-size: 200% 200%;
          animation: bgg-gradient-shift 3s ease infinite, bgg-glow-pulse 2s ease-in-out infinite;
        }
        .bgg-cta::before {
          content: "";
          position: absolute; inset: 0;
          background: inherit;
          animation: bgg-glitch-clip 4s infinite;
          pointer-events: none; z-index: 1;
        }
        .bgg-cta::after {
          content: "";
          position: absolute; inset: 0;
          animation: bgg-color-flicker 4s infinite;
          pointer-events: none; z-index: 1;
        }
        .bgg-cta:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 40px rgba(124,58,237,0.7), 0 0 80px rgba(124,58,237,0.3);
        }
        .bgg-cta:active:not(:disabled) {
          transform: translateY(0) scale(0.99);
        }
        .bgg-cta:disabled, .bgg-cta.is-off {
          opacity: 0.5; cursor: not-allowed; animation: none; box-shadow: none;
        }
        .bgg-cta:disabled::before, .bgg-cta:disabled::after,
        .bgg-cta.is-off::before, .bgg-cta.is-off::after { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .bgg-cta, .bgg-cta::before, .bgg-cta::after { animation: none !important; }
        }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        disabled={isOff}
        title={disabled && disabledReason ? disabledReason : undefined}
        aria-label={`Generate Brand Guideline in ${formatLabel(format)} format`}
        className={`bgg-cta ${isOff ? "is-off" : ""}`}
        style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: 12,
          border: "none",
          cursor: isOff ? "not-allowed" : "pointer",
          color: "white",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: 10 }}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Brand Guideline
            </>
          )}
        </span>
      </button>
      <div
        className="mt-2 text-center"
        style={{ fontSize: 11, color: "#64748B" }}
      >
        Brand Summary required · Brand Details & Keywords optional
      </div>
    </div>
  );
}
