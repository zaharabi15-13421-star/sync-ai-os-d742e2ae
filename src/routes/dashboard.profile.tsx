import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  User, Building2, Phone, MapPin, Upload, X, Check, Lock,
  Loader2, Search, ChevronDown, Globe,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { COUNTRIES, findCountryByCode, type Country } from "@/data/countries";
import { validateProfile, type ValidationErrors } from "@/utils/profileValidation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BrandSync AI" },
      { name: "description", content: "Manage your company profile, contact, and address information." },
    ],
  }),
  component: ProfilePage,
});

// ===== Industry groups =====
const INDUSTRY_GROUPS = [
  { label: "Technology", items: ["SaaS / Software", "Fintech", "Healthtech", "E-commerce", "Cybersecurity", "AI / Machine Learning", "Gaming", "Media & Entertainment"] },
  { label: "Services", items: ["Consulting", "Legal", "Finance & Banking", "Healthcare & Wellness", "Education & E-learning", "Real Estate", "Marketing & Advertising", "HR & Recruitment"] },
  { label: "Consumer", items: ["Fashion & Apparel", "Food & Beverage", "Beauty & Cosmetics", "Home & Lifestyle", "Sports & Fitness", "Travel & Hospitality", "Retail", "Automotive"] },
  { label: "Other", items: ["Non-profit / NGO", "Government / Public Sector", "Religious / Community", "Other"] },
];

const TEAM_SIZES = [
  "Just me (1)", "Small team (2–10)", "Growing team (11–50)",
  "Mid-size (51–200)", "Large (201–500)", "Enterprise (500+)",
];

// ===== Shared input styles =====
const INPUT_CLS =
  "w-full h-10 rounded-lg bg-[#1C2128] border border-white/10 px-3 text-sm text-white placeholder:text-[#6E7681] focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-[#00C9A7]/30 transition";

const LABEL_CLS = "block text-[13px] font-medium text-[#C9D1D9] mb-1.5";
const SECTION_LABEL_CLS = "text-[11px] uppercase tracking-[0.08em] text-[#8B949E] mb-1";
const SECTION_HEAD_CLS = "text-lg font-semibold text-white mb-5";
const CARD_CLS = "rounded-xl border border-white/[0.08] bg-[#161B22] p-7 mb-6";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-[12px] text-[#F85149] mt-1.5">{msg}</p>;
}

// ===== Custom Select =====
function DarkSelect<T extends string>({
  value, onChange, placeholder, options, groups,
}: {
  value: T;
  onChange: (v: T) => void;
  placeholder: string;
  options?: readonly T[];
  groups?: { label: string; items: readonly T[] }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(INPUT_CLS, "flex items-center justify-between text-left")}
      >
        <span className={value ? "text-white" : "text-[#6E7681]"}>{value || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-[#8B949E]" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-white/15 bg-[#1C2128] shadow-xl">
          {groups ? groups.map((g) => (
            <div key={g.label}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[#6E7681]">{g.label}</div>
              {g.items.map((opt) => (
                <button
                  key={opt as string}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    "block w-full text-left px-3 py-2 text-sm hover:bg-white/5",
                    value === opt ? "text-white bg-white/[0.04]" : "text-[#C9D1D9]"
                  )}
                >{opt as string}</button>
              ))}
            </div>
          )) : options?.map((opt) => (
            <button
              key={opt as string}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "block w-full text-left px-3 py-2 text-sm hover:bg-white/5",
                value === opt ? "text-white bg-white/[0.04]" : "text-[#C9D1D9]"
              )}
            >{opt as string}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Country combobox =====
function CountryCombobox({
  value, onChange, placeholder = "Select country",
}: {
  value?: string;
  onChange: (c: Country) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = findCountryByCode(value);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(term) || c.dial.includes(term) || c.code.toLowerCase().includes(term));
  }, [q]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(INPUT_CLS, "flex items-center justify-between text-left")}>
        {selected ? (
          <span className="flex items-center gap-2 text-white"><span className="text-lg">{selected.flag}</span>{selected.name}</span>
        ) : (
          <span className="text-[#6E7681] flex items-center gap-2"><Globe className="h-4 w-4" />{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 text-[#8B949E]" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-white/15 bg-[#1C2128] shadow-xl">
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6E7681]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search country or code..."
                className="w-full h-8 rounded-md bg-[#0D1117] border border-white/10 pl-8 pr-2 text-sm text-white placeholder:text-[#6E7681] focus:outline-none focus:border-white/25"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.code + c.dial}
                type="button"
                onClick={() => { onChange(c); setOpen(false); setQ(""); }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-[#C9D1D9] hover:bg-white/5"
              >
                <span className="flex items-center gap-2"><span className="text-lg">{c.flag}</span>{c.name}</span>
                <span className="text-[#6E7681] text-xs">{c.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-4 text-sm text-[#6E7681] text-center">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Phone dial selector (compact) =====
function DialSelector({
  countryCode, dial, onChange,
}: {
  countryCode: string; dial: string;
  onChange: (c: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = findCountryByCode(countryCode);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(t) || c.dial.includes(t));
  }, [q]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-10 rounded-l-lg bg-[#1C2128] border border-r-0 border-white/10 px-3 text-sm text-white flex items-center gap-1.5 min-w-[100px] hover:border-white/20"
      >
        <span className="text-lg">{selected?.flag || "🌐"}</span>
        <span className="text-[#C9D1D9]">{selected?.dial || dial}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#8B949E] ml-auto" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 rounded-lg border border-white/15 bg-[#1C2128] shadow-xl">
          <div className="p-2 border-b border-white/5">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country or code..."
              className="w-full h-8 rounded-md bg-[#0D1117] border border-white/10 px-2 text-sm text-white placeholder:text-[#6E7681] focus:outline-none focus:border-white/25" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((c) => (
              <button key={c.code + c.dial} type="button"
                onClick={() => { onChange(c); setOpen(false); setQ(""); }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-[#C9D1D9] hover:bg-white/5"
              >
                <span className="flex items-center gap-2"><span className="text-lg">{c.flag}</span>{c.name}</span>
                <span className="text-[#6E7681] text-xs">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Logo upload =====
function LogoUpload({
  currentUrl, stagedPreview, onFile, onRemove,
}: {
  currentUrl?: string;
  stagedPreview?: string | null;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = stagedPreview || currentUrl;
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);

  const handleFile = (file: File) => {
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      toast.error("Invalid file type", { description: "PNG, SVG, or JPG only." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 2MB." });
      return;
    }
    setFileMeta({ name: file.name, size: file.size });
    onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
      }}
      className={cn(
        "rounded-[10px] border border-dashed bg-white/[0.02] p-5 transition",
        drag ? "border-[#00C9A7]/60 bg-[#00C9A7]/5" : "border-white/15"
      )}
    >
      <input ref={inputRef} type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {preview ? (
        <div className="flex items-center gap-4">
          <img src={preview} alt="Logo" className="h-20 w-20 rounded-lg border border-white/10 object-contain bg-black/20" />
          <div className="flex-1 min-w-0">
            {fileMeta && (
              <>
                <div className="text-[13px] text-[#C9D1D9] truncate">{fileMeta.name}</div>
                <div className="text-[12px] text-[#6E7681]">{(fileMeta.size / 1024).toFixed(1)} KB</div>
              </>
            )}
            {!fileMeta && <div className="text-[13px] text-[#C9D1D9]">Current logo</div>}
            <div className="flex items-center gap-3 mt-2">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="text-[12px] text-[#00C9A7] border border-[#00C9A7]/40 hover:bg-[#00C9A7]/10 px-3 py-1 rounded-md">Replace</button>
              <button type="button" onClick={() => { setFileMeta(null); onRemove(); }}
                className="text-[12px] text-[#F85149] hover:underline">Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full text-center py-2">
          <Upload className="h-8 w-8 text-[#00C9A7] mx-auto mb-2" />
          <div className="text-sm text-[#8B949E]">Drop your logo here or click to upload</div>
          <div className="text-[12px] text-[#6E7681] mt-1">PNG, SVG, JPG up to 2MB</div>
        </button>
      )}
    </div>
  );
}

// ===== Skeleton =====
function FormSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className={CARD_CLS}>
          <div className="h-5 w-48 rounded bg-white/5 mb-5 shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-10 rounded-lg bg-white/5 shimmer" />
            ))}
          </div>
        </div>
      ))}
      <style>{`
        .shimmer{background:linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 100%);background-size:200% 100%;animation:sh 1.5s infinite;}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
    </>
  );
}

// ===== Main page =====
function ProfilePage() {
  const {
    isLoading, isSaving, isDirty, lastSaved, formData, stagedLogoPreview,
    updateField, stageLogo, removeLogo, saveProfile, completionPct,
  } = useProfile();

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [activeSection, setActiveSection] = useState("section-company");

  // Scroll spy
  useEffect(() => {
    const ids = ["section-company", "section-contact", "section-address"];
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 200) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const initials = useMemo(() => {
    const src = formData.company_name || formData.email || "U";
    return src.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  }, [formData.company_name, formData.email]);

  const handleSave = useCallback(async () => {
    const errs = validateProfile(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields");
      const first = Object.keys(errs)[0];
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      await saveProfile();
      toast.success("Profile updated", { description: "Your changes have been saved successfully." });
    } catch (err: any) {
      toast.error("Save failed", { description: err?.message || "Unknown error" });
    }
  }, [formData, saveProfile]);

  const goalChars = (formData.business_goal || "").length;
  const sloganChars = (formData.slogan || "").length;

  const navLinks = [
    { id: "section-company", label: "Company Information" },
    { id: "section-contact", label: "Contact Information" },
    { id: "section-address", label: "Address Information" },
  ];

  return (
    <div className="text-foreground">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-[#8B949E] mt-1">Manage your company, contact, and address information.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left summary */}
        <aside className="lg:w-[260px] lg:shrink-0">
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#161B22] p-6 text-center">
              {stagedLogoPreview || formData.logo_url ? (
                <img src={stagedLogoPreview || formData.logo_url}
                  alt="Logo" className="h-20 w-20 rounded-full object-cover mx-auto border-2"
                  style={{ borderColor: "rgba(0,201,167,0.3)" }} />
              ) : (
                <div className="h-20 w-20 rounded-full mx-auto grid place-items-center text-white text-2xl font-bold"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#00C9A7)" }}>
                  {initials}
                </div>
              )}
              <button type="button" onClick={() => scrollTo("section-company")}
                className="text-[12px] text-[#00C9A7] hover:underline mt-2">Change photo</button>
              <div className="mt-3 text-[16px] font-semibold text-white truncate">{formData.company_name || "Untitled brand"}</div>
              {formData.email && <div className="text-[13px] text-[#8B949E] truncate">{formData.email}</div>}
              {formData.slogan && <div className="text-[12px] text-[#C9D1D9] mt-1 italic truncate">"{formData.slogan}"</div>}
              {formData.industry && (
                <div className="inline-block mt-2 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(0,201,167,0.1)", color: "#00C9A7" }}>{formData.industry}</div>
              )}
              <div className="my-4 border-t border-white/[0.06]" />
              <div className="text-left">
                <div className="flex items-center justify-between text-[12px] text-[#8B949E] mb-1.5">
                  <span>Profile Completion</span><span>{completionPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${completionPct}%`, background: "linear-gradient(90deg,#00C9A7,#8B5CF6)" }} />
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="rounded-xl border border-white/[0.08] bg-[#161B22] p-2">
              {navLinks.map((l) => {
                const active = activeSection === l.id;
                return (
                  <button key={l.id} onClick={() => scrollTo(l.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[13px] rounded-md transition flex items-center gap-2 border-l-[3px]",
                      active ? "bg-white/[0.04] text-white border-[#00C9A7]" : "text-[#8B949E] hover:bg-white/[0.03] hover:text-white border-transparent",
                    )}
                  >{l.label}</button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right form */}
        <section className="flex-1 min-w-0">
          {isLoading ? <FormSkeleton /> : (
            <>
              {/* COMPANY */}
              <div id="section-company" className={CARD_CLS}>
                <div className={SECTION_LABEL_CLS}>01 · COMPANY</div>
                <h2 className={SECTION_HEAD_CLS}>Company Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div data-field="company_name">
                    <label className={LABEL_CLS}>Company or Brand Name <span className="text-[#F85149]">*</span></label>
                    <input className={INPUT_CLS} placeholder="e.g. Acme Corporation"
                      value={formData.company_name}
                      onChange={(e) => updateField("company_name", e.target.value)} />
                    <FieldError msg={errors.company_name} />
                  </div>
                  <div data-field="website_url">
                    <label className={LABEL_CLS}>Website URL</label>
                    <input className={INPUT_CLS} placeholder="https://www.yourcompany.com"
                      value={formData.website_url}
                      onChange={(e) => updateField("website_url", e.target.value)} />
                    <FieldError msg={errors.website_url} />
                  </div>

                  <div className="md:col-span-2" data-field="slogan">
                    <label className={LABEL_CLS}>Slogan</label>
                    <input className={INPUT_CLS} placeholder="A short, memorable tagline for your brand"
                      maxLength={160}
                      value={formData.slogan}
                      onChange={(e) => updateField("slogan", e.target.value)} />
                    <div className="flex items-center justify-between">
                      <FieldError msg={errors.slogan} />
                      <span className="text-[11px] text-[#6E7681] ml-auto mt-1">{sloganChars}/160</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={LABEL_CLS}>Company Logo</label>
                    <LogoUpload currentUrl={formData.logo_url} stagedPreview={stagedLogoPreview}
                      onFile={stageLogo} onRemove={removeLogo} />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Industry <span className="text-[#F85149]">*</span></label>
                    <DarkSelect value={formData.industry as any} onChange={(v) => updateField("industry", v)}
                      placeholder="Select industry" groups={INDUSTRY_GROUPS as any} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Team Size</label>
                    <DarkSelect value={formData.team_size as any} onChange={(v) => updateField("team_size", v)}
                      placeholder="Select team size" options={TEAM_SIZES as any} />
                  </div>

                  <div className="md:col-span-2" data-field="business_goal">
                    <label className={LABEL_CLS}>Business Goal</label>
                    <textarea
                      className={cn(INPUT_CLS, "h-auto min-h-[80px] py-2.5 resize-y")}
                      placeholder="What is your primary business objective? e.g. Increase brand awareness, drive online sales, expand into new markets..."
                      maxLength={300}
                      value={formData.business_goal}
                      onChange={(e) => updateField("business_goal", e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <FieldError msg={errors.business_goal} />
                      <span className="text-[11px] text-[#6E7681] ml-auto mt-1">{goalChars}/300</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTACT */}
              <div id="section-contact" className={CARD_CLS}>
                <div className={SECTION_LABEL_CLS}>02 · CONTACT</div>
                <h2 className={SECTION_HEAD_CLS}>Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Email Address</label>
                    <div className="relative">
                      <input className={cn(INPUT_CLS, "opacity-60 cursor-not-allowed pr-9")}
                        value={formData.email || ""} readOnly disabled />
                      <Lock className="h-3.5 w-3.5 text-[#6E7681] absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] text-[#6E7681] mt-1">To change your email, please contact support.</p>
                  </div>
                  <div data-field="phone_number">
                    <label className={LABEL_CLS}>Phone Number</label>
                    <div className="flex">
                      <DialSelector countryCode={formData.phone_country_code} dial={formData.phone_country_dial}
                        onChange={(c) => {
                          updateField("phone_country_code", c.code);
                          updateField("phone_country_dial", c.dial);
                        }} />
                      <input
                        className={cn(INPUT_CLS, "rounded-l-none flex-1")}
                        placeholder="1234 567890"
                        inputMode="tel"
                        value={formData.phone_number}
                        onChange={(e) => updateField("phone_number", e.target.value.replace(/[^\d\s-]/g, ""))}
                      />
                    </div>
                    <FieldError msg={errors.phone_number} />
                  </div>
                </div>
              </div>

              {/* ADDRESS */}
              <div id="section-address" className={CARD_CLS}>
                <div className={SECTION_LABEL_CLS}>03 · ADDRESS</div>
                <h2 className={SECTION_HEAD_CLS}>Address Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={LABEL_CLS}>Country <span className="text-[#F85149]">*</span></label>
                    <CountryCombobox value={formData.country_code}
                      onChange={(c) => { updateField("country", c.name); updateField("country_code", c.code); }} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL_CLS}>Street Address</label>
                    <input className={INPUT_CLS} placeholder="123 Main Street, Suite 400"
                      value={formData.street_address}
                      onChange={(e) => updateField("street_address", e.target.value)} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>City</label>
                    <input className={INPUT_CLS} placeholder="Dhaka"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                  <div data-field="postal_code">
                    <label className={LABEL_CLS}>Postal Code</label>
                    <input className={INPUT_CLS} placeholder="1207"
                      value={formData.postal_code}
                      onChange={(e) => updateField("postal_code", e.target.value)} />
                    <FieldError msg={errors.postal_code} />
                  </div>
                </div>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={cn(
                  "w-full h-12 rounded-[10px] text-white font-semibold text-base flex items-center justify-center gap-2 transition",
                  (!isDirty || isSaving) ? "opacity-45 cursor-not-allowed" : "hover:brightness-110 hover:scale-[1.005]"
                )}
                style={{ background: "linear-gradient(to right,#00C9A7,#8B5CF6)" }}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <div className="text-center text-[12px] text-[#6E7681] mt-2">
                {lastSaved ? `Last saved: ${lastSaved.toLocaleString()}` : "No changes saved yet"}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
