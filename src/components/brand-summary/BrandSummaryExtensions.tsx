import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, Quote, Sparkles, Layers, Mic, Crown, Pencil, X,
  Loader2, Upload, Check, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useBrandSummaryExtras } from "@/hooks/useBrandSummaryExtras";
import type { BrandArchetype, BrandSummaryExtras } from "@/lib/brand-summary-extras.functions";

type Ctx = {
  brandName?: string;
  url?: string;
  summary?: string;
  colors?: Record<string, string>;
};

const TONE_OPTIONS = [
  "Professional","Friendly","Bold & Edgy","Playful",
  "Inspirational","Luxury","Technical","Empathetic",
];

const ARCHETYPES: { name: string; description: string }[] = [
  { name: "The Explorer", description: "Adventurous, free, pioneering" },
  { name: "The Jester", description: "Playful, fun, lives in the moment" },
  { name: "The Ruler", description: "Authoritative, leading, prestigious" },
  { name: "The Rebel", description: "Challenging norms, disruptive" },
  { name: "The Lover", description: "Passionate, intimate, relationship-led" },
  { name: "The Innocent", description: "Optimistic, simple, wholesome" },
  { name: "The Everyperson", description: "Relatable, humble, grounded" },
  { name: "The Magician", description: "Transformative, visionary, inspiring" },
  { name: "The Hero", description: "Courageous, determined, inspires achievement" },
  { name: "The Coach", description: "Supportive, growth-oriented, motivational" },
  { name: "The Scholar", description: "Expertise-led, research-driven" },
  { name: "The Empowerer", description: "Unlocks potential, confidence-building" },
  { name: "The Pathfinder", description: "Helps learners discover opportunities" },
  { name: "The Sage", description: "Wise, knowledgeable, analytical" },
  { name: "The Creator", description: "Innovative, imaginative, expressive" },
  { name: "The Caregiver", description: "Nurturing, compassionate, supportive" },
  { name: "The Outlaw", description: "Rebellious, provocative, revolutionary" },
  { name: "The Mentor", description: "Guiding, educational, empowering" },
  { name: "The Citizen", description: "Trustworthy, community-focused, dependable" },
];

/* ============ Shared shells ============ */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">{children}</div>;
}

function Header({
  icon, title, onEdit,
}: { icon: React.ReactNode; title: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">{icon} {title}</div>
      <button
        onClick={onEdit}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2a3318] text-[#d4e09a] hover:bg-[#3a4a20] transition"
        aria-label={`Edit ${title}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 text-sm italic text-muted-foreground">{children}</div>;
}

function Pill({ children, selected = false, onClick }: { children: React.ReactNode; selected?: boolean; onClick?: () => void }) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] border transition";
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${base} cursor-pointer ${
          selected
            ? "bg-purple-500/20 border-purple-400/50 text-purple-200"
            : "bg-white/[0.06] border-white/10 text-foreground/85 hover:border-purple-400/40 hover:text-white"
        }`}
      >
        {children}
        {selected && <Check className="h-3 w-3" />}
      </button>
    );
  }
  return <span className={`${base} bg-white/[0.06] border-white/10 text-foreground/85`}>{children}</span>;
}

/* ============ Modal shell ============ */

function Modal({
  open, onClose, title, subtitle, children, applying, onApply, onAIEnhance, enhancing, canEnhance = true,
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string;
  children: React.ReactNode; applying?: boolean; onApply: () => void;
  onAIEnhance?: () => void; enhancing?: boolean; canEnhance?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d35] p-7 shadow-[0_30px_70px_rgba(0,0,0,0.55)] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          {onAIEnhance && canEnhance ? (
            <button
              onClick={onAIEnhance}
              disabled={enhancing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium bg-purple-500/15 border border-purple-400/30 text-purple-200 hover:bg-purple-500/25 hover:border-purple-400/60 disabled:opacity-50 transition"
            >
              {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {enhancing ? "Enhancing…" : "Enhance with AI"}
            </button>
          ) : <span />}
          <button
            onClick={onApply}
            disabled={applying}
            className="px-5 py-2 rounded-full text-sm font-medium bg-[#2a3318] text-[#d4e09a] hover:bg-[#3a4a20] disabled:opacity-50"
          >
            {applying ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1.5">
    {children}
  </label>
);

const inputCls =
  "w-full bg-[#111428] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition";

/* ============ Tag input (Pomelli style) ============ */

function TagInput({
  value, onChange, placeholder, max = 20,
}: { value: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) { setDraft(""); return; }
    if (value.length >= max) { toast.error(`Max ${max} tags`); return; }
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="relative">
      <div className="rounded-lg border border-white/10 bg-[#111428] p-3 min-h-[120px] flex flex-wrap gap-2 content-start focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[13px] bg-white/[0.06] border border-white/10 text-foreground/90">
            {t}
            <button
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-white/10 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-300"
              aria-label={`Remove ${t}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[160px] bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

/* ============ The 6 sections + their modals ============ */

export function BrandSummaryExtensions({ ctx }: { ctx: Ctx }) {
  const { data, loading, save, saving, enhance } = useBrandSummaryExtras();
  const ext: BrandSummaryExtras = data ?? {
    logo_url: null, tagline: null, brand_values: [], brand_aesthetic: [], brand_tone: [], brand_archetype: null,
  };

  const [openModal, setOpenModal] = useState<null | "logo" | "tagline" | "values" | "aesthetic" | "tone" | "archetype">(null);
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(null);

  // Resolve signed URL for private logo paths
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!ext.logo_url) { setResolvedLogo(null); return; }
      if (/^https?:\/\//i.test(ext.logo_url)) { setResolvedLogo(ext.logo_url); return; }
      const { data: signed } = await supabase.storage.from("brand-logos").createSignedUrl(ext.logo_url, 60 * 60);
      if (!cancel) setResolvedLogo(signed?.signedUrl ?? null);
    })();
    return () => { cancel = true; };
  }, [ext.logo_url]);

  const close = () => setOpenModal(null);

  return (
    <div className="space-y-5">
      {/* Logo */}
      <Card>
        <Header icon={<ImageIcon className="h-4 w-4 text-purple-300" />} title="Brand Logo" onEdit={() => setOpenModal("logo")} />
        <div className="mt-4 flex items-center justify-center">
          {loading ? (
            <div className="h-20 w-40 rounded-md bg-white/[0.04] animate-pulse" />
          ) : resolvedLogo ? (
            <img src={resolvedLogo} alt="Brand logo" className="max-h-20 max-w-[240px] object-contain rounded-md" />
          ) : (
            <div className="h-20 w-full max-w-sm border border-dashed border-white/15 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <ImageIcon className="h-5 w-5" />
              No logo uploaded
            </div>
          )}
        </div>
      </Card>

      {/* Tagline */}
      <Card>
        <Header icon={<Quote className="h-4 w-4 text-purple-300" />} title="Tagline" onEdit={() => setOpenModal("tagline")} />
        {ext.tagline ? (
          <p className="mt-3 text-[18px] italic font-medium text-[#d4e09a] leading-relaxed">"{ext.tagline}"</p>
        ) : <Empty>No tagline yet</Empty>}
      </Card>

      {/* Brand Values */}
      <Card>
        <Header icon={<Sparkles className="h-4 w-4 text-purple-300" />} title="Brand Values" onEdit={() => setOpenModal("values")} />
        {ext.brand_values.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {ext.brand_values.map((v) => <Pill key={v}>{v}</Pill>)}
          </div>
        ) : <Empty>No brand values set</Empty>}
      </Card>

      {/* Brand Aesthetic */}
      <Card>
        <Header icon={<Layers className="h-4 w-4 text-purple-300" />} title="Brand Aesthetic" onEdit={() => setOpenModal("aesthetic")} />
        {ext.brand_aesthetic.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {ext.brand_aesthetic.map((v) => <Pill key={v}>{v}</Pill>)}
          </div>
        ) : <Empty>No aesthetic descriptors set</Empty>}
      </Card>

      {/* Brand Tone */}
      <Card>
        <Header icon={<Mic className="h-4 w-4 text-purple-300" />} title="Brand Tone of Voice" onEdit={() => setOpenModal("tone")} />
        {ext.brand_tone.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {ext.brand_tone.map((v) => <Pill key={v}>{v}</Pill>)}
          </div>
        ) : <Empty>No brand tone selected</Empty>}
      </Card>

      {/* Brand Archetype */}
      <Card>
        <Header icon={<Crown className="h-4 w-4 text-purple-300" />} title="Brand Archetype" onEdit={() => setOpenModal("archetype")} />
        {ext.brand_archetype ? (
          <div className="mt-3">
            <div className="text-[15px] font-medium text-white">{ext.brand_archetype.name}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">{ext.brand_archetype.description}</div>
          </div>
        ) : <Empty>No archetype selected</Empty>}
      </Card>

      {/* === Modals === */}
      <LogoModal
        open={openModal === "logo"} onClose={close}
        currentPath={ext.logo_url} resolvedUrl={resolvedLogo}
        saving={saving} save={(logo_url) => save({ logo_url }).then(close)}
      />
      <TaglineModal
        open={openModal === "tagline"} onClose={close}
        current={ext.tagline ?? ""} saving={saving}
        save={(tagline) => save({ tagline }).then(close)}
        enhance={enhance} ctx={ctx}
      />
      <TagListModal
        open={openModal === "values"} onClose={close}
        title="Brand Values" subtitle="Describe your brand's values"
        placeholder="Press Enter to add a new brand value..."
        current={ext.brand_values} saving={saving} max={20}
        save={(brand_values) => save({ brand_values }).then(close)}
        enhance={enhance} ctx={ctx} field="brand_values"
      />
      <TagListModal
        open={openModal === "aesthetic"} onClose={close}
        title="Brand Aesthetic" subtitle="Describe your brand's visual aesthetic"
        placeholder="Press Enter to add an aesthetic tag..."
        current={ext.brand_aesthetic} saving={saving} max={15}
        save={(brand_aesthetic) => save({ brand_aesthetic }).then(close)}
        enhance={enhance} ctx={ctx} field="brand_aesthetic"
      />
      <ToneModal
        open={openModal === "tone"} onClose={close}
        current={ext.brand_tone} saving={saving}
        save={(brand_tone) => save({ brand_tone }).then(close)}
        enhance={enhance} ctx={ctx}
      />
      <ArchetypeModal
        open={openModal === "archetype"} onClose={close}
        current={ext.brand_archetype} saving={saving}
        save={(brand_archetype) => save({ brand_archetype }).then(close)}
        enhance={enhance} ctx={ctx}
      />
    </div>
  );
}

/* ============ Individual modals ============ */

function LogoModal({
  open, onClose, currentPath, resolvedUrl, saving, save,
}: {
  open: boolean; onClose: () => void; currentPath: string | null;
  resolvedUrl: string | null; saving: boolean; save: (v: string | null) => Promise<unknown>;
}) {
  const [preview, setPreview] = useState<string | null>(resolvedUrl);
  const [newPath, setNewPath] = useState<string | null>(currentPath);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setPreview(resolvedUrl); setNewPath(currentPath); } }, [open, resolvedUrl, currentPath]);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    if (!/^image\/(png|jpeg|svg\+xml|webp|jpg)$/.test(file.type)) { toast.error("PNG, JPG, SVG or WEBP only"); return; }
    setUploading(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${uid}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("brand-logos").createSignedUrl(path, 60 * 60);
      setPreview(signed?.signedUrl ?? null);
      setNewPath(path);
      toast.success("Uploaded — click Apply to save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="Brand Logo" subtitle="Upload or update your brand logo"
      applying={saving} onApply={() => save(newPath)}
      onAIEnhance={undefined}
    >
      <div
        className="border-2 border-dashed border-white/15 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400/50 hover:bg-purple-500/5 transition min-h-[160px] flex flex-col items-center justify-center gap-2"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin text-purple-300" />
        ) : preview ? (
          <img src={preview} alt="Preview" className="max-h-24 max-w-[220px] object-contain" />
        ) : (
          <>
            <Upload className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag &amp; drop or click to upload</p>
            <span className="text-xs text-muted-foreground/70">PNG, JPG, SVG, WEBP up to 5MB</span>
          </>
        )}
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {newPath && (
        <button
          onClick={() => { setPreview(null); setNewPath(null); }}
          className="mt-3 text-xs text-rose-300 hover:text-rose-200"
        >
          Remove logo
        </button>
      )}
    </Modal>
  );
}

function TaglineModal({
  open, onClose, current, saving, save, enhance, ctx,
}: {
  open: boolean; onClose: () => void; current: string; saving: boolean;
  save: (v: string | null) => Promise<unknown>;
  enhance: (args: { data: any }) => Promise<{ value: string }>;
  ctx: Ctx;
}) {
  const [v, setV] = useState(current);
  const [enhancing, setEnhancing] = useState(false);
  useEffect(() => { if (open) setV(current); }, [open, current]);

  const doEnhance = async () => {
    setEnhancing(true);
    try {
      const res = await enhance({ data: { field: "tagline", current: v, context: ctx } });
      setV(res.value);
      toast.success("AI suggestion applied — review and save");
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setEnhancing(false); }
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="Tagline" subtitle="Edit your brand's tagline"
      applying={saving} onApply={() => save(v.trim() || null)}
      onAIEnhance={doEnhance} enhancing={enhancing}
    >
      <Label>Tagline</Label>
      <input
        className={inputCls}
        value={v} onChange={(e) => setV(e.target.value)}
        maxLength={160}
        placeholder="e.g. Become an IT Pro & Rule the Digital World"
      />
      <div className="mt-1.5 text-[11px] text-muted-foreground text-right">{v.length}/160</div>
    </Modal>
  );
}

function TagListModal({
  open, onClose, title, subtitle, placeholder, current, saving, save, enhance, ctx, field, max,
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string; placeholder: string;
  current: string[]; saving: boolean; save: (v: string[]) => Promise<unknown>;
  enhance: (args: { data: any }) => Promise<{ value: string[] }>;
  ctx: Ctx; field: "brand_values" | "brand_aesthetic"; max: number;
}) {
  const [v, setV] = useState<string[]>(current);
  const [enhancing, setEnhancing] = useState(false);
  useEffect(() => { if (open) setV(current); }, [open, current]);

  const doEnhance = async () => {
    setEnhancing(true);
    try {
      const res = await enhance({ data: { field, current: v, context: ctx } });
      setV(Array.from(new Set([...(v ?? []), ...res.value])).slice(0, max));
      toast.success("AI suggestions added — review and save");
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setEnhancing(false); }
  };

  return (
    <Modal
      open={open} onClose={onClose} title={title} subtitle={subtitle}
      applying={saving} onApply={() => save(v)}
      onAIEnhance={doEnhance} enhancing={enhancing}
    >
      <Label>{title}</Label>
      <TagInput value={v} onChange={setV} placeholder={placeholder} max={max} />
      <div className="mt-1.5 text-[11px] text-muted-foreground">Press Enter to add. {v.length}/{max}</div>
    </Modal>
  );
}

function ToneModal({
  open, onClose, current, saving, save, enhance, ctx,
}: {
  open: boolean; onClose: () => void; current: string[]; saving: boolean;
  save: (v: string[]) => Promise<unknown>;
  enhance: (args: { data: any }) => Promise<{ value: string[] }>;
  ctx: Ctx;
}) {
  const [v, setV] = useState<string[]>(current);
  const [custom, setCustom] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  useEffect(() => { if (open) { setV(current); setCustom(""); } }, [open, current]);

  const toggle = (t: string) => {
    setV(v.includes(t) ? v.filter((x) => x !== t) : v.length >= 5 ? v : [...v, t]);
  };
  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    if (!v.includes(t) && v.length < 5) setV([...v, t]);
    setCustom("");
  };
  const doEnhance = async () => {
    setEnhancing(true);
    try {
      const res = await enhance({ data: { field: "brand_tone", current: v, context: ctx } });
      setV(Array.from(new Set(res.value)).slice(0, 5));
      toast.success("AI suggestions applied — review and save");
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setEnhancing(false); }
  };

  const all = Array.from(new Set([...TONE_OPTIONS, ...v]));

  return (
    <Modal
      open={open} onClose={onClose}
      title="Brand Tone of Voice" subtitle="Select your brand's tone(s) of voice"
      applying={saving} onApply={() => save(v)}
      onAIEnhance={doEnhance} enhancing={enhancing}
    >
      <Label>Select up to 5</Label>
      <div className="flex flex-wrap gap-2">
        {all.map((t) => <Pill key={t} selected={v.includes(t)} onClick={() => toggle(t)}>{t}</Pill>)}
      </div>

      <div className="mt-5">
        <Label>Add custom tone</Label>
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="Type a custom tone…"
          />
          <button
            onClick={addCustom}
            className="px-4 py-2 rounded-full text-[13px] bg-[#2a3318] text-[#d4e09a] hover:bg-[#3a4a20] whitespace-nowrap"
          >Add</button>
        </div>
      </div>
    </Modal>
  );
}

function ArchetypeModal({
  open, onClose, current, saving, save, enhance, ctx,
}: {
  open: boolean; onClose: () => void; current: BrandArchetype; saving: boolean;
  save: (v: BrandArchetype) => Promise<unknown>;
  enhance: (args: { data: any }) => Promise<{ value: { name: string; description: string } }>;
  ctx: Ctx;
}) {
  const [sel, setSel] = useState<BrandArchetype>(current);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  useEffect(() => { if (open) { setSel(current); setName(""); setDesc(""); } }, [open, current]);

  const doEnhance = async () => {
    setEnhancing(true);
    try {
      const res = await enhance({ data: { field: "brand_archetype", current: sel, context: ctx } });
      setSel(res.value);
      toast.success("AI suggestion applied — review and save");
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setEnhancing(false); }
  };

  const addCustom = () => {
    if (!name.trim() || !desc.trim()) return;
    setSel({ name: name.trim(), description: desc.trim() });
    setName(""); setDesc("");
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="Brand Archetype" subtitle="Choose the archetype that best represents your brand"
      applying={saving} onApply={() => save(sel)}
      onAIEnhance={doEnhance} enhancing={enhancing}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {ARCHETYPES.map((a) => {
          const active = sel?.name === a.name;
          return (
            <button
              key={a.name}
              onClick={() => setSel(a)}
              className={`relative text-left p-3 rounded-lg border transition ${
                active
                  ? "border-purple-400/60 bg-purple-500/15"
                  : "border-white/10 bg-[#111428] hover:border-purple-400/40 hover:bg-white/[0.05]"
              }`}
            >
              <div className="text-[13px] font-medium text-white">{a.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{a.description}</div>
              {active && <CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-purple-300" />}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <Label>Or add custom archetype</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Archetype name" maxLength={80} />
          <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" maxLength={200} />
          <button
            onClick={addCustom}
            className="px-4 py-2 rounded-full text-[13px] bg-[#2a3318] text-[#d4e09a] hover:bg-[#3a4a20] whitespace-nowrap"
          >Add</button>
        </div>
      </div>
    </Modal>
  );
}
