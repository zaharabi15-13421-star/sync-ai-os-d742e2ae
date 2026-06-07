import { useEffect, useMemo, useState } from "react";
import { Pencil, MapPin, Phone, Clock, Tag, Share2, Link2, MessageSquare, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { BrandDetailsModal, TextField, TextArea, Checkbox } from "./shared";
import { DAY_LABEL, DAY_ORDER, type BrandDetails, type BusinessHours, type DayHours, type DayKey } from "@/types/brandDetails";

type ModalKey = null | "location" | "phone" | "hours" | "keywords" | "social" | "cta" | "testimonials";

function ensureProtocol(v: string) {
  if (!v) return v;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
function isValidUrl(v: string) { try { new URL(v); return true; } catch { return false; } }
function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const DEFAULT_DAY: DayHours = { open: false, start: "09:00 AM", end: "05:00 PM" };

export function BrandDetailsTab() {
  const { data, isLoading, error, refetch, updateSection, isUpdating } = useBrandDetails();
  const [modal, setModal] = useState<ModalKey>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const close = () => { setModal(null); setModalError(null); };

  const save = async (patch: Partial<BrandDetails>, sectionLabel: string) => {
    setModalError(null);
    try {
      await updateSection(patch);
      toast.success(`${sectionLabel} updated successfully`);
    } catch (e) {
      setModalError("Failed to save. Please try again.");
      throw e;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`rounded-[12px] animate-pulse h-[72px] ${i === 6 ? "md:col-span-2" : ""}`}
               style={{ background: "linear-gradient(90deg, #0F0F1A, #111122, #0F0F1A)", backgroundSize: "200% 100%", border: "0.5px solid #1E1E35" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] p-8 text-center" style={{ background: "#0F0F1A", border: "0.5px solid #1E1E35" }}>
        <AlertCircle className="mx-auto mb-3" size={32} color="#EF4444" />
        <div className="text-[16px]" style={{ color: "#E2E8F0" }}>Couldn't load your brand details</div>
        <div className="text-[13px] mt-1" style={{ color: "#94A3B8" }}>Please check your connection and try again.</div>
        <button onClick={() => refetch()} className="mt-4 text-[13px] px-4 py-2 rounded-[8px]" style={{ color: "#A78BFA", background: "rgba(124,58,237,0.12)", border: "0.5px solid rgba(124,58,237,0.25)" }}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <div className="mt-1"><Share2 size={18} color="#A78BFA" /></div>
        <div>
          <h2 className="text-[22px] font-semibold" style={{ color: "#E2E8F0" }}>Brand Details</h2>
          <p className="text-[14px] mt-1" style={{ color: "#94A3B8" }}>Manage your business information, contact details, hours, and online presence.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Location" icon={<MapPin size={16} color="#A78BFA" />} preview={<LocationPreview d={data} />} onEdit={() => setModal("location")} />
        <Card title="Phone Number" icon={<Phone size={16} color="#A78BFA" />} preview={data.phone_number ? <PreviewText>{data.phone_number}</PreviewText> : null} onEdit={() => setModal("phone")} />
        <Card title="Business Hours" icon={<Clock size={16} color="#A78BFA" />} preview={<HoursPreview d={data} />} onEdit={() => setModal("hours")} />
        <Card title="Keywords" icon={<Tag size={16} color="#A78BFA" />} preview={<KeywordsPreview d={data} />} onEdit={() => setModal("keywords")} />
        <Card title="Social Links" icon={<Share2 size={16} color="#A78BFA" />} preview={<SocialPreview d={data} />} onEdit={() => setModal("social")} />
        <Card title="Call-to-Action Links" icon={<Link2 size={16} color="#A78BFA" />}
              titleAdornment={<TooltipInfo text="Add direct action links for your customers" />}
              preview={<CtaPreview d={data} />} onEdit={() => setModal("cta")} />
        <div className="md:col-span-2">
          <Card title="Testimonials" icon={<MessageSquare size={16} color="#A78BFA" />} preview={<TestimonialsPreview d={data} />} onEdit={() => setModal("testimonials")} />
        </div>
      </div>

      <LocationModal open={modal === "location"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
      <PhoneModal open={modal === "phone"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
      <HoursModal open={modal === "hours"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
      <KeywordsModal open={modal === "keywords"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
      <SocialModal open={modal === "social"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
      <CtaModal open={modal === "cta"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
      <TestimonialsModal open={modal === "testimonials"} onClose={close} data={data} onSave={save} isSaving={isUpdating} err={modalError} />
    </div>
  );
}

/* ─── Card + previews ─── */

function Card({ title, icon, preview, onEdit, titleAdornment }: { title: string; icon?: React.ReactNode; preview?: React.ReactNode; onEdit: () => void; titleAdornment?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-4 rounded-[12px] transition-colors"
      style={{ background: "#0F0F1A", border: "0.5px solid #1E1E35", minHeight: 72 }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2D2D4E"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E1E35"; }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[16px] font-medium" style={{ color: "#E2E8F0" }}>{title}</span>
          {titleAdornment}
        </div>
        {preview && <div className="mt-1.5">{preview}</div>}
      </div>
      <button
        onClick={onEdit}
        aria-label={`Edit ${title}`}
        className="flex items-center justify-center transition shrink-0"
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(124,58,237,0.12)", border: "0.5px solid rgba(124,58,237,0.25)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.2)"; e.currentTarget.style.borderColor = "#7C3AED"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.12)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; }}
      >
        <Pencil size={15} color="#A78BFA" />
      </button>
    </div>
  );
}

function PreviewText({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] truncate" style={{ color: "#94A3B8" }}>{children}</div>;
}
function TooltipInfo({ text }: { text: string }) {
  return <span className="relative group inline-flex"><Info size={14} color="#64748B" />
    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 hidden group-hover:block whitespace-nowrap text-[11px] px-2 py-1 rounded" style={{ background: "#1A1A2E", border: "0.5px solid #2D2D4E", color: "#E2E8F0" }}>{text}</span>
  </span>;
}

function LocationPreview({ d }: { d: BrandDetails }) {
  if (!d.address_lines) return null;
  return <PreviewText>{d.address_lines.split("\n")[0]}</PreviewText>;
}
function HoursPreview({ d }: { d: BrandDetails }) {
  if (d.business_hours_not_applicable) {
    return <span className="inline-block text-[11px] px-2 py-0.5 rounded" style={{ background: "rgba(100,116,139,0.12)", color: "#64748B" }}>Not applicable</span>;
  }
  const hrs = d.business_hours as BusinessHours;
  const today = DAY_ORDER[new Date().getDay()];
  const t = hrs?.[today];
  if (t?.open) return <PreviewText>Open today: {t.start} – {t.end}</PreviewText>;
  const anyOpen = DAY_ORDER.some((k) => hrs?.[k]?.open);
  if (!anyOpen) return <div className="text-[12px]" style={{ color: "#64748B" }}>Hours not set</div>;
  return <PreviewText>Closed today</PreviewText>;
}
function KeywordsPreview({ d }: { d: BrandDetails }) {
  if (!d.keywords?.length) return null;
  const shown = d.keywords.slice(0, 3);
  const extra = d.keywords.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {shown.map((k) => <span key={k} className="text-[11px] px-2 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.08)", color: "#A78BFA" }}>{k}</span>)}
      {extra > 0 && <span className="text-[11px]" style={{ color: "#64748B" }}>+{extra} more</span>}
    </div>
  );
}
function SocialPreview({ d }: { d: BrandDetails }) {
  const items: Array<[string, string | null, string]> = [
    ["Facebook", d.social_facebook, "#1877F2"],
    ["Instagram", d.social_instagram, "#E4405F"],
    ["LinkedIn", d.social_linkedin_personal || d.social_linkedin_company, "#0A66C2"],
    ["X", d.social_twitter, "#E2E8F0"],
    ["YouTube", d.social_youtube_channel || d.social_youtube_user, "#FF0000"],
    ["TikTok", d.social_tiktok, "#E2E8F0"],
    ["Pinterest", d.social_pinterest, "#E60023"],
  ];
  const active = items.filter(([, v]) => v);
  if (!active.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {active.map(([name, , color]) => (
        <span key={name} title={name} className="inline-flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 4, background: `${color}22`, color }}>
          <span className="text-[9px] font-bold">{name[0]}</span>
        </span>
      ))}
    </div>
  );
}
function CtaPreview({ d }: { d: BrandDetails }) {
  const n = [d.cta_business_email, d.cta_appointment_url, d.cta_order_ahead_url, d.cta_reservation_url, d.cta_shop_online_url, d.cta_custom_url].filter(Boolean).length;
  return n ? <PreviewText>{n} link{n === 1 ? "" : "s"} configured</PreviewText> : null;
}
function TestimonialsPreview({ d }: { d: BrandDetails }) {
  const n = [d.testimonial_1, d.testimonial_2, d.testimonial_3, d.testimonial_4].filter((t) => (t ?? "").trim().length > 0).length;
  return n ? <PreviewText>{n} testimonial{n === 1 ? "" : "s"} added</PreviewText> : null;
}

/* ─── Modals ─── */

type ModalProps = {
  open: boolean; onClose: () => void; data: BrandDetails;
  onSave: (patch: Partial<BrandDetails>, label: string) => Promise<void>;
  isSaving: boolean; err: string | null;
};

function LocationModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [s, set] = useState({ address_lines: "", city: "", state_province: "", postal_code: "", country_region_code: "" });
  useEffect(() => { if (open) set({
    address_lines: data.address_lines ?? "", city: data.city ?? "", state_province: data.state_province ?? "",
    postal_code: data.postal_code ?? "", country_region_code: data.country_region_code ?? "",
  }); }, [open, data]);
  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Location" subtitle="Edit your business address"
      isApplying={isSaving} error={err}
      onApply={() => onSave({
        address_lines: s.address_lines || null, city: s.city || null,
        state_province: s.state_province || null, postal_code: s.postal_code || null,
        country_region_code: s.country_region_code || null,
      }, "Location")}>
      <div className="flex flex-col gap-3">
        <TextArea placeholder="Address Lines" value={s.address_lines} onChange={(e) => set({ ...s, address_lines: e.target.value })} />
        <TextField placeholder="City / Locality" value={s.city} onChange={(e) => set({ ...s, city: e.target.value })} />
        <TextField placeholder="State / Province / Administrative Area" value={s.state_province} onChange={(e) => set({ ...s, state_province: e.target.value })} />
        <TextField placeholder="Postal Code" value={s.postal_code} onChange={(e) => set({ ...s, postal_code: e.target.value })} />
        <TextField placeholder="Country / Region Code" value={s.country_region_code} onChange={(e) => set({ ...s, country_region_code: e.target.value })} />
      </div>
    </BrandDetailsModal>
  );
}

function PhoneModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [v, setV] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setV(data.phone_number ?? ""); setLocalErr(null); } }, [open, data]);
  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Phone Number" subtitle="Edit your business phone number"
      isApplying={isSaving} error={err || localErr}
      onApply={async () => {
        if (!v.trim()) { setLocalErr("Phone number is required"); throw new Error("required"); }
        await onSave({ phone_number: v.trim() }, "Phone Number");
      }}>
      <TextField type="tel" placeholder="Phone Number*" value={v} onChange={(e) => { setV(e.target.value); setLocalErr(null); }} />
    </BrandDetailsModal>
  );
}

function HoursModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [na, setNa] = useState(false);
  const [hrs, setHrs] = useState<BusinessHours>(() => Object.fromEntries(DAY_ORDER.map((d) => [d, { ...DEFAULT_DAY }])) as BusinessHours);
  useEffect(() => {
    if (!open) return;
    setNa(data.business_hours_not_applicable);
    const incoming = (data.business_hours as BusinessHours) || ({} as BusinessHours);
    setHrs(Object.fromEntries(DAY_ORDER.map((d) => [d, incoming[d] ?? { ...DEFAULT_DAY }])) as BusinessHours);
  }, [open, data]);
  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Business Hours" subtitle="Manage the hours your business is open"
      isApplying={isSaving} error={err}
      onApply={() => onSave({ business_hours_not_applicable: na, business_hours: hrs }, "Business Hours")}>
      <div className="mb-5"><Checkbox checked={na} onChange={setNa} label="Not applicable" /></div>
      <div style={{ opacity: na ? 0.4 : 1, pointerEvents: na ? "none" : "auto" }}>
        {DAY_ORDER.map((d, i) => (
          <div key={d} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < 6 ? "0.5px solid #1E1E35" : undefined }}>
            <div className="text-[14px] font-medium" style={{ color: "#E2E8F0", minWidth: 80 }}>{DAY_LABEL[d]}</div>
            <Checkbox checked={hrs[d].open} onChange={(v) => setHrs({ ...hrs, [d]: { ...hrs[d], open: v } })} ariaLabel={`${DAY_LABEL[d]} open`} />
            <span className="text-[13px]" style={{ color: "#94A3B8" }}>Open</span>
            <div className="flex items-center gap-2 ml-auto" style={{ opacity: hrs[d].open ? 1 : 0.4, pointerEvents: hrs[d].open ? "auto" : "none" }}>
              <input aria-label={`${DAY_LABEL[d]} opening time`} value={hrs[d].start}
                onChange={(e) => setHrs({ ...hrs, [d]: { ...hrs[d], start: e.target.value } })}
                className="text-center" style={{ width: 110, padding: "8px 10px", fontSize: 13, color: "#E2E8F0", background: "#080814", border: "0.5px solid #1E1E35", borderRadius: 6 }} />
              <span style={{ color: "#64748B" }}>–</span>
              <input aria-label={`${DAY_LABEL[d]} closing time`} value={hrs[d].end}
                onChange={(e) => setHrs({ ...hrs, [d]: { ...hrs[d], end: e.target.value } })}
                className="text-center" style={{ width: 110, padding: "8px 10px", fontSize: 13, color: "#E2E8F0", background: "#080814", border: "0.5px solid #1E1E35", borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </BrandDetailsModal>
  );
}

function KeywordsModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [warn, setWarn] = useState<string | null>(null);
  useEffect(() => { if (open) { setChips(data.keywords ?? []); setInput(""); setWarn(null); } }, [open, data]);
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (chips.length >= 20) { setWarn("Maximum 20 keywords reached"); return; }
    if (chips.some((c) => c.toLowerCase() === v.toLowerCase())) { setWarn("Already added"); return; }
    setChips([...chips, v]); setInput(""); setWarn(null);
  };
  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Keywords" subtitle="Add keywords that describe your business"
      isApplying={isSaving} error={err}
      onApply={() => onSave({ keywords: chips }, "Keywords")}>
      <div className="flex flex-wrap gap-1.5 items-center" style={{ background: "#080814", border: "0.5px solid #1E1E35", borderRadius: 8, padding: "10px 14px", minHeight: 52 }}>
        {chips.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5" style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.3)", borderRadius: 6, padding: "3px 8px 3px 10px", color: "#A78BFA", fontSize: 12 }}>
            {c}
            <button onClick={() => setChips(chips.filter((x) => x !== c))} aria-label={`Remove keyword ${c}`} style={{ color: "#64748B" }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setWarn(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
            else if (e.key === "Backspace" && !input && chips.length) { setChips(chips.slice(0, -1)); }
          }}
          placeholder={chips.length ? "" : "Press Enter to add a new keyword..."}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ color: "#E2E8F0", minWidth: 200 }}
        />
      </div>
      {warn && <div className="mt-1.5 text-[11px]" style={{ color: "#F59E0B" }}>{warn}</div>}
      {chips.length > 0 && <div className="mt-1.5 text-[11px]" style={{ color: "#64748B" }}>{chips.length} keywords added</div>}
    </BrandDetailsModal>
  );
}

function SocialModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [s, setS] = useState({
    social_facebook: "", social_instagram: "",
    social_linkedin_personal: "", social_linkedin_company: "",
    social_twitter: "", social_youtube_channel: "", social_youtube_user: "",
    social_tiktok: "", social_pinterest: "",
  });
  useEffect(() => { if (open) setS({
    social_facebook: data.social_facebook ?? "", social_instagram: data.social_instagram ?? "",
    social_linkedin_personal: data.social_linkedin_personal ?? "", social_linkedin_company: data.social_linkedin_company ?? "",
    social_twitter: data.social_twitter ?? "", social_youtube_channel: data.social_youtube_channel ?? "",
    social_youtube_user: data.social_youtube_user ?? "", social_tiktok: data.social_tiktok ?? "",
    social_pinterest: data.social_pinterest ?? "",
  }); }, [open, data]);
  const normalize = (v: string) => v ? ensureProtocol(v.trim()) : "";
  const setField = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value });
  const blurField = (k: keyof typeof s) => () => setS((prev) => ({ ...prev, [k]: normalize(prev[k]) }));

  const Section = ({ children, divider }: { children: React.ReactNode; divider?: boolean }) => (
    <div className="mb-5" style={{ paddingBottom: divider ? 20 : 0, borderBottom: divider ? "0.5px solid #1E1E35" : undefined }}>{children}</div>
  );
  const Header = ({ color, label, extra }: { color: string; label: string; extra?: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: 4, background: `${color}33`, color, fontWeight: 700, fontSize: 11 }}>{label[0]}</span>
      <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>{label}</span>
      {extra && <span className="text-[12px]" style={{ color: "#94A3B8" }}>{extra}</span>}
    </div>
  );
  const Sub = ({ children }: { children: React.ReactNode }) => <div className="text-[12px] mt-2.5 mb-1" style={{ color: "#64748B" }}>{children}</div>;

  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Social links" subtitle="Add usernames for your social media profiles"
      isApplying={isSaving} error={err}
      onApply={() => onSave({
        social_facebook: s.social_facebook || null, social_instagram: s.social_instagram || null,
        social_linkedin_personal: s.social_linkedin_personal || null, social_linkedin_company: s.social_linkedin_company || null,
        social_twitter: s.social_twitter || null, social_youtube_channel: s.social_youtube_channel || null,
        social_youtube_user: s.social_youtube_user || null, social_tiktok: s.social_tiktok || null,
        social_pinterest: s.social_pinterest || null,
      }, "Social Links")}>
      <Section divider><Header color="#1877F2" label="Facebook" /><TextField placeholder="https://www.facebook.com/ username" value={s.social_facebook} onChange={setField("social_facebook")} onBlur={blurField("social_facebook")} /></Section>
      <Section divider><Header color="#E4405F" label="Instagram" /><TextField placeholder="https://www.instagram.com/ username" value={s.social_instagram} onChange={setField("social_instagram")} onBlur={blurField("social_instagram")} /></Section>
      <Section divider>
        <Header color="#0A66C2" label="LinkedIn" extra="(enter either Personal or Company)" />
        <Sub>Personal</Sub><TextField placeholder="https://www.linkedin.com/in/ username" value={s.social_linkedin_personal} onChange={setField("social_linkedin_personal")} onBlur={blurField("social_linkedin_personal")} />
        <Sub>Company</Sub><TextField placeholder="https://www.linkedin.com/company/ username" value={s.social_linkedin_company} onChange={setField("social_linkedin_company")} onBlur={blurField("social_linkedin_company")} />
      </Section>
      <Section divider><Header color="#E2E8F0" label="X (Twitter)" /><TextField placeholder="https://www.x.com/ username" value={s.social_twitter} onChange={setField("social_twitter")} onBlur={blurField("social_twitter")} /></Section>
      <Section divider>
        <Header color="#FF0000" label="YouTube" extra="(enter either Channel ID or User ID)" />
        <Sub>Channel ID</Sub><TextField placeholder="https://www.youtube.com/channel/ channel ID" value={s.social_youtube_channel} onChange={setField("social_youtube_channel")} onBlur={blurField("social_youtube_channel")} />
        <Sub>User ID</Sub><TextField placeholder="https://www.youtube.com/@ username" value={s.social_youtube_user} onChange={setField("social_youtube_user")} onBlur={blurField("social_youtube_user")} />
      </Section>
      <Section divider><Header color="#E2E8F0" label="TikTok" /><TextField placeholder="https://www.tiktok.com/@ username" value={s.social_tiktok} onChange={setField("social_tiktok")} onBlur={blurField("social_tiktok")} /></Section>
      <Section><Header color="#E60023" label="Pinterest" /><TextField placeholder="https://www.pinterest.com/ username" value={s.social_pinterest} onChange={setField("social_pinterest")} onBlur={blurField("social_pinterest")} /></Section>
    </BrandDetailsModal>
  );
}

function CtaModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [s, setS] = useState({
    cta_business_email: "", cta_appointment_url: "", cta_order_ahead_url: "",
    cta_reservation_url: "", cta_shop_online_url: "", cta_custom_url: "",
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => { if (open) {
    setS({
      cta_business_email: data.cta_business_email ?? "", cta_appointment_url: data.cta_appointment_url ?? "",
      cta_order_ahead_url: data.cta_order_ahead_url ?? "", cta_reservation_url: data.cta_reservation_url ?? "",
      cta_shop_online_url: data.cta_shop_online_url ?? "", cta_custom_url: data.cta_custom_url ?? "",
    }); setErrs({});
  } }, [open, data]);

  const validateUrl = (k: keyof typeof s) => () => {
    const v = s[k];
    if (!v) { setErrs((p) => ({ ...p, [k]: "" })); return; }
    const norm = ensureProtocol(v.trim());
    setS({ ...s, [k]: norm });
    setErrs((p) => ({ ...p, [k]: isValidUrl(norm) ? "" : "Please enter a valid URL" }));
  };

  const urlField = (k: Exclude<keyof typeof s, "cta_business_email">, ph: string) => (
    <div>
      <TextField type="url" placeholder={ph} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} onBlur={validateUrl(k)}
        style={errs[k] ? { borderColor: "#EF4444" } : undefined} />
      {errs[k] && <div className="mt-1 text-[11px]" style={{ color: "#EF4444" }}>{errs[k]}</div>}
    </div>
  );

  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Call-to-Action Links" subtitle="Add links to your business's call-to-action pages"
      isApplying={isSaving} error={err}
      onApply={() => onSave({
        cta_business_email: s.cta_business_email || null,
        cta_appointment_url: s.cta_appointment_url || null,
        cta_order_ahead_url: s.cta_order_ahead_url || null,
        cta_reservation_url: s.cta_reservation_url || null,
        cta_shop_online_url: s.cta_shop_online_url || null,
        cta_custom_url: s.cta_custom_url || null,
      }, "Call-to-Action Links")}>
      <div className="flex flex-col gap-3">
        <div>
          <TextField type="email" placeholder="Business Email" value={s.cta_business_email}
            onChange={(e) => setS({ ...s, cta_business_email: e.target.value })}
            onBlur={() => setErrs((p) => ({ ...p, cta_business_email: s.cta_business_email && !isValidEmail(s.cta_business_email) ? "Please enter a valid email" : "" }))}
            style={errs.cta_business_email ? { borderColor: "#EF4444" } : undefined} />
          {errs.cta_business_email && <div className="mt-1 text-[11px]" style={{ color: "#EF4444" }}>{errs.cta_business_email}</div>}
        </div>
        {urlField("cta_appointment_url", "Appointment URL")}
        {urlField("cta_order_ahead_url", "Order ahead URL")}
        {urlField("cta_reservation_url", "Reservation URL")}
        {urlField("cta_shop_online_url", "Shop online URL")}
        {urlField("cta_custom_url", "Custom URL")}
      </div>
    </BrandDetailsModal>
  );
}

function TestimonialsModal({ open, onClose, data, onSave, isSaving, err }: ModalProps) {
  const [s, setS] = useState({ t1: "", t2: "", t3: "", t4: "" });
  useEffect(() => { if (open) setS({
    t1: data.testimonial_1 ?? "", t2: data.testimonial_2 ?? "",
    t3: data.testimonial_3 ?? "", t4: data.testimonial_4 ?? "",
  }); }, [open, data]);
  const over = useMemo(() => Object.values(s).some((v) => v.length > 500), [s]);

  const field = (n: 1 | 2 | 3 | 4, key: "t1" | "t2" | "t3" | "t4") => {
    const val = s[key];
    return (
      <div>
        <div className="text-[12px] font-medium mb-1.5" style={{ color: "#64748B" }}>Testimonial {n}</div>
        <TextArea placeholder={n === 1 ? "Enter a customer review..." : ""} value={val}
          onChange={(e) => setS({ ...s, [key]: e.target.value })}
          style={{ minHeight: 100, ...(val.length > 500 ? { borderColor: "#EF4444" } : {}) }} />
        <div className="text-right text-[10px] mt-1" style={{ color: val.length > 500 ? "#EF4444" : "#64748B" }}>{val.length} / 500 characters</div>
      </div>
    );
  };

  return (
    <BrandDetailsModal isOpen={open} onClose={onClose} title="Testimonials" subtitle="Add up to 4 testimonials for your business"
      isApplying={isSaving} error={err || (over ? "One or more testimonials exceed 500 characters" : null)}
      onApply={async () => {
        if (over) throw new Error("over");
        await onSave({
          testimonial_1: s.t1 || null, testimonial_2: s.t2 || null,
          testimonial_3: s.t3 || null, testimonial_4: s.t4 || null,
        }, "Testimonials");
      }}>
      <div className="flex flex-col gap-4">
        {field(1, "t1")}{field(2, "t2")}{field(3, "t3")}{field(4, "t4")}
      </div>
    </BrandDetailsModal>
  );
}
