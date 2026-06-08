import { FileText, Presentation, FileType, Globe, Check, FileBox } from "lucide-react";

export type GuidelineFormat = "pdf" | "ppt" | "docx" | "web";

type FormatDef = {
  id: GuidelineFormat;
  title: string;
  subtitle: string;
  badge: string;
  badgeStyle: { bg: string; color: string };
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const FORMATS: FormatDef[] = [
  {
    id: "pdf",
    title: "PDF",
    subtitle: "Exportable document",
    badge: "Download",
    badgeStyle: { bg: "rgba(34,197,94,0.12)", color: "#22C55E" },
    icon: FileText,
    iconBg: "rgba(239,68,68,0.15)",
    iconColor: "#EF4444",
  },
  {
    id: "ppt",
    title: "PowerPoint",
    subtitle: "Slide deck format",
    badge: "Download",
    badgeStyle: { bg: "rgba(34,197,94,0.12)", color: "#22C55E" },
    icon: Presentation,
    iconBg: "rgba(245,158,11,0.15)",
    iconColor: "#F59E0B",
  },
  {
    id: "docx",
    title: "Word Doc",
    subtitle: "Editable document",
    badge: "Download",
    badgeStyle: { bg: "rgba(34,197,94,0.12)", color: "#22C55E" },
    icon: FileType,
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3B82F6",
  },
  {
    id: "web",
    title: "Web Brand Book",
    subtitle: "Interactive microsite",
    badge: "Opens in browser",
    badgeStyle: { bg: "rgba(124,58,237,0.08)", color: "#A78BFA" },
    icon: Globe,
    iconBg: "rgba(124,58,237,0.08)",
    iconColor: "#A78BFA",
  },
];

export function FormatSelector({
  value,
  onChange,
}: {
  value: GuidelineFormat;
  onChange: (v: GuidelineFormat) => void;
}) {
  return (
    <div
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #1E1E35",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div className="flex items-center gap-2">
        <FileBox className="h-4 w-4 text-[#A78BFA]" />
        <div className="text-sm font-semibold text-[#E2E8F0]">Export Format</div>
      </div>
      <div className="mt-1 text-xs text-[#94A3B8]">
        Choose how you want your Brand Guideline delivered
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {FORMATS.map((f) => {
          const selected = value === f.id;
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${f.title} format`}
              onClick={() => onChange(f.id)}
              className="text-left transition-all"
              style={{
                background: selected ? "rgba(124,58,237,0.08)" : "#111122",
                border: `0.5px solid ${selected ? "#7C3AED" : "#1E1E35"}`,
                borderRadius: 12,
                padding: "14px 16px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: selected
                  ? "0 0 0 1px #7C3AED, inset 0 0 20px rgba(124,58,237,0.05)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.borderColor = "#2D2D4E";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.borderColor = "#1E1E35";
                  e.currentTarget.style.background = "#111122";
                }
              }}
            >
              {selected && (
                <div
                  className="absolute"
                  style={{
                    top: 8,
                    right: 8,
                    width: 16,
                    height: 16,
                    background: "#7C3AED",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              <div
                style={{
                  background: f.iconBg,
                  borderRadius: 8,
                  padding: 8,
                  color: f.iconColor,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#E2E8F0]">{f.title}</div>
                <div className="text-[11px] text-[#94A3B8] truncate">{f.subtitle}</div>
                <span
                  className="inline-block mt-1 text-[9px] font-medium rounded"
                  style={{
                    background: f.badgeStyle.bg,
                    color: f.badgeStyle.color,
                    padding: "2px 6px",
                  }}
                >
                  {f.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatLabel(f: GuidelineFormat): string {
  return FORMATS.find((x) => x.id === f)?.title ?? f;
}
