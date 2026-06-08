import { useMemo } from "react";
import {
  Sparkles, Loader2, Check, CircleCheck, Download, RefreshCw, ExternalLink, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { GuidelineFormat } from "./FormatSelector";
import { formatLabel } from "./FormatSelector";
import type { GenStatus, Step } from "@/hooks/useBrandGuidelineGen";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;

const FEATURE_CHIPS = [
  "Brand Identity", "Color System", "Typography",
  "Brand Voice", "Usage Guidelines", "Competitor Context",
];

export function GenerationPanel({
  status,
  progress,
  steps,
  format,
  result,
  brandSummary,
  onReset,
}: {
  status: GenStatus;
  progress: number;
  steps: Step[];
  format: GuidelineFormat;
  result: any;
  brandSummary: any;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 24,
        height: "calc(100vh - 280px)",
        minHeight: 600,
      }}
      className="flex flex-col"
    >
      {status === "idle" && <IdlePanel format={format} />}
      {status === "generating" && (
        <LivePanel progress={progress} steps={steps} format={format} />
      )}
      {status === "complete" && (
        <CompletePanel
          format={format}
          result={result}
          brandSummary={brandSummary}
          onReset={onReset}
        />
      )}
      {status === "error" && (
        <ErrorPanel onReset={onReset} />
      )}
    </div>
  );
}

function IdlePanel({ format }: { format: GuidelineFormat }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden"
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #1E1E35",
        borderRadius: 16,
        padding: "40px 32px",
      }}
    >
      <style>{`
        @keyframes bgg-mesh-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes bgg-pulse-core { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        @keyframes bgg-rotate-ring { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(124,58,237,0.04), rgba(168,85,247,0.06), rgba(59,130,246,0.04), rgba(124,58,237,0.04))",
          animation: "bgg-mesh-spin 20s linear infinite",
        }}
      />
      <div className="relative" style={{ width: 120, height: 120 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "1px solid rgba(124,58,237,0.2)",
            animation: "bgg-rotate-ring 8s linear infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            inset: 15,
            border: "1px solid rgba(124,58,237,0.15)",
          }}
        />
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: 30,
            background: "rgba(124,58,237,0.08)",
            border: "0.5px solid rgba(124,58,237,0.3)",
            animation: "bgg-pulse-core 2s ease-in-out infinite",
          }}
        >
          <Sparkles className="h-7 w-7 text-[#A78BFA]" />
        </div>
      </div>
      <div
        className="mt-6 font-semibold text-[#E2E8F0]"
        style={{ fontSize: 20 }}
      >
        Your Brand Guideline Awaits
      </div>
      <div
        className="mt-2 text-[#94A3B8]"
        style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}
      >
        Select a format and click Generate to create your comprehensive AI-powered brand
        guideline based on your analysis data.
      </div>
      <div className="mt-5 flex flex-wrap gap-2 justify-center" style={{ maxWidth: 360 }}>
        {FEATURE_CHIPS.map((c) => (
          <span
            key={c}
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "0.5px solid rgba(124,58,237,0.2)",
              color: "#A78BFA",
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
            }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-4 text-[#64748B]" style={{ fontSize: 12 }}>
        Currently selected: {formatLabel(format)}
      </div>
    </div>
  );
}

function LivePanel({
  progress, steps, format,
}: { progress: number; steps: Step[]; format: GuidelineFormat }) {
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #7C3AED",
        borderRadius: 16,
        boxShadow: "0 0 30px rgba(124,58,237,0.15)",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          background: "#111122",
          borderBottom: "0.5px solid #1E1E35",
          padding: "16px 20px",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{
              width: 8, height: 8, background: "#7C3AED",
              animation: "bgg-pulse-core 1.4s ease-in-out infinite",
            }}
          />
          <span className="text-sm font-medium text-[#E2E8F0]">
            Generating Brand Guideline
          </span>
          <span
            className="ml-1 text-[10px] font-medium rounded"
            style={{
              background: "rgba(124,58,237,0.08)",
              color: "#A78BFA",
              padding: "2px 6px",
            }}
          >
            {formatLabel(format).toUpperCase()}
          </span>
        </div>
        <div
          className="font-bold text-[#A78BFA]"
          style={{ fontSize: 20 }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {progress}%
        </div>
      </div>
      <div style={{ height: 3, background: "#1E1E35", width: "100%" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, #7C3AED, #9D5FF3, #A78BFA)",
            transition: "width 500ms ease",
          }}
        />
      </div>
      <div className="flex-1 overflow-y-auto" style={{ padding: "16px 20px" }}>
        <div aria-live="polite">
          {steps.map((s) => (
            <StepCard key={s.id} step={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div
      className="mb-2.5 flex gap-3"
      style={{
        background: "#111122",
        border: "0.5px solid #1E1E35",
        borderRadius: 10,
        padding: "14px 16px",
        animation: "bgg-slide-in 300ms ease-out",
      }}
    >
      <style>{`
        @keyframes bgg-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="flex-shrink-0 mt-0.5">
        {step.status === "complete" ? (
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 20, height: 20, background: "#22C55E" }}
          >
            <Check className="h-3 w-3 text-white" />
          </div>
        ) : step.status === "active" ? (
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 20, height: 20, border: "2px solid #7C3AED" }}
          >
            <Loader2 className="h-3 w-3 text-[#A78BFA] animate-spin" />
          </div>
        ) : (
          <div
            className="rounded-full"
            style={{ width: 20, height: 20, border: "2px solid #1E1E35" }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-medium"
          style={{
            color:
              step.status === "pending" ? "#64748B" : "#E2E8F0",
          }}
        >
          {step.title}
        </div>
        <div className="text-[12px] text-[#94A3B8] mt-1">{step.description}</div>
        {step.status === "active" && (
          <div style={{ height: 2, background: "#1E1E35", marginTop: 8, borderRadius: 1, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                background: "#7C3AED",
                width: "100%",
                animation: "bgg-step-bar 2s ease-in-out infinite",
              }}
            />
            <style>{`@keyframes bgg-step-bar { 0% { width: 0% } 90% { width: 95% } 100% { width: 100% } }`}</style>
          </div>
        )}
        {step.status === "complete" && step.preview && (
          <div
            className="mt-2 text-[11px] text-[#94A3B8]"
            style={{
              background: "rgba(34,197,94,0.06)",
              borderLeft: "2px solid #22C55E",
              borderRadius: 4,
              padding: "6px 10px",
            }}
          >
            {step.preview}
          </div>
        )}
      </div>
    </div>
  );
}

function CompletePanel({
  format, result, brandSummary, onReset,
}: { format: GuidelineFormat; result: any; brandSummary: any; onReset: () => void }) {
  const primaryColor = brandSummary?.brand_colors?.[0]?.hex ?? "#7C3AED";
  const primaryFont = brandSummary?.typography?.[0]?.font ?? "Inter";
  const brandName = brandSummary?.brand_name ?? "Your Brand";

  const colors = useMemo<string[]>(() => {
    return (brandSummary?.brand_colors ?? []).slice(0, 4).map((c: any) => c.hex);
  }, [brandSummary]);

  const handleDownload = () => {
    if (result?.blob && result?.fileName) {
      saveAs(result.blob, result.fileName);
      return;
    }
    if (result?.fileUrl) {
      window.open(result.fileUrl, "_blank");
    } else {
      toast.error("No file available");
    }
  };

  const handleOpenWeb = () => {
    if (result?.webBookSlug) {
      window.open(`/brand-book/${result.webBookSlug}`, "_blank");
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #22C55E",
        borderRadius: 16,
        boxShadow: "0 0 30px rgba(34,197,94,0.1)",
      }}
    >
      <div
        className="flex items-center gap-2.5"
        style={{
          background: "rgba(34,197,94,0.06)",
          borderBottom: "0.5px solid rgba(34,197,94,0.2)",
          padding: "16px 20px",
        }}
      >
        <CircleCheck className="h-5 w-5 text-[#22C55E]" />
        <div>
          <div className="text-sm font-semibold text-[#E2E8F0]">Brand Guideline Ready!</div>
          <div className="text-xs text-[#94A3B8]">
            Your professional brand guideline has been generated
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
        <div
          style={{
            background: "#111122",
            border: "0.5px solid #1E1E35",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, #6D28D9)`,
              padding: "20px 24px",
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {brandSummary?.logo_url ? (
                <img
                  src={brandSummary.logo_url}
                  alt=""
                  style={{
                    width: 40, height: 40,
                    borderRadius: 8, objectFit: "contain",
                    background: "white",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40, height: 40,
                    borderRadius: 8, background: "white",
                    color: primaryColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 18,
                  }}
                >
                  {brandName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="font-bold text-white" style={{ fontSize: 16 }}>
                {brandName}
              </div>
            </div>
            <div
              className="text-white"
              style={{
                fontSize: 10, fontWeight: 600,
                letterSpacing: "0.15em",
                opacity: 0.7,
              }}
            >
              BRAND GUIDELINES
            </div>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <PreviewSection
              left={
                <div
                  style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: primaryColor,
                  }}
                />
              }
              title="Brand Identity"
              preview={`${brandName} · ${brandSummary?.brand_aesthetic ?? "Modern"}`}
            />
            <PreviewSection
              left={
                <div className="flex gap-1">
                  {colors.map((c, i) => (
                    <div
                      key={i}
                      style={{ width: 10, height: 10, borderRadius: "50%", background: c }}
                    />
                  ))}
                </div>
              }
              title="Color System"
              preview={`${brandSummary?.brand_colors?.length ?? 0} colors defined`}
            />
            <PreviewSection
              left={
                <div style={{ fontFamily: primaryFont, fontSize: 14, color: "#E2E8F0" }}>Aa</div>
              }
              title="Typography"
              preview={`${primaryFont} · Headings & body`}
            />
            <PreviewSection
              left={<MessageCircle className="h-4 w-4 text-[#A78BFA]" />}
              title="Brand Voice & Tone"
              preview={`${brandSummary?.brand_tone ?? "Professional"} · ${brandSummary?.brand_archetype ?? "Strategic"}`}
            />
            <div className="text-[11px] text-[#64748B] text-center mt-1">
              ... and 7 more sections
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px", borderTop: "0.5px solid #1E1E35" }}>
        <div className="flex justify-around mb-3">
          <Stat value={result?.sectionsCount ?? 11} label="Sections" />
          <Stat value="Pro Grade" label="Quality" color="#22C55E" />
          <Stat value={formatLabel(format)} label="Format" color="#A78BFA" small />
        </div>
        <div className="flex flex-col gap-2.5">
          {format === "web" ? (
            <Button
              onClick={handleOpenWeb}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              style={{ borderRadius: 10, padding: "13px 20px", fontWeight: 600 }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Web Brand Book
            </Button>
          ) : (
            <Button
              onClick={handleDownload}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              style={{ borderRadius: 10, padding: "13px 20px", fontWeight: 600 }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download {formatLabel(format)}
            </Button>
          )}
          <Button
            onClick={onReset}
            variant="ghost"
            className="w-full text-[#94A3B8] hover:text-[#E2E8F0]"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewSection({
  left, title, preview,
}: { left: React.ReactNode; title: string; preview: string }) {
  return (
    <div
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #1E1E35",
        borderRadius: 8,
        padding: "12px 14px",
      }}
      className="flex items-center gap-3"
    >
      <div className="flex-shrink-0">{left}</div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-[#E2E8F0]">{title}</div>
        <div className="text-[11px] text-[#94A3B8] truncate">{preview}</div>
      </div>
    </div>
  );
}

function Stat({
  value, label, color, small,
}: { value: string | number; label: string; color?: string; small?: boolean }) {
  return (
    <div className="text-center">
      <div
        style={{
          fontSize: small ? 14 : 18,
          fontWeight: 700,
          color: color ?? "#E2E8F0",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#64748B" }}>{label}</div>
    </div>
  );
}

function ErrorPanel({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center"
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #EF4444",
        borderRadius: 16,
        padding: 40,
      }}
    >
      <div className="text-[#EF4444] text-lg font-semibold">Generation failed</div>
      <div className="mt-2 text-sm text-[#94A3B8]">Please try again.</div>
      <Button onClick={onReset} className="mt-6 bg-[#7C3AED] hover:bg-[#6D28D9]">
        Try Again
      </Button>
    </div>
  );
}
