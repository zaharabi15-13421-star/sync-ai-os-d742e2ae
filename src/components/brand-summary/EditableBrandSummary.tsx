import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Sparkles, Check, X, Pencil, Loader2, Upload, RefreshCw, Trash2, Quote,
  Heart, Palette as PaletteIcon, MessageCircle, UserCheck, FileText, Type,
  Link as LinkIcon, Globe, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useBrandSummary } from "@/hooks/useBrandSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  BRAND_TONE_OPTIONS,
  BRAND_ARCHETYPE_OPTIONS,
  type BrandSummary,
  type BrandColor,
  type TypographyEntry,
} from "@/types/brandSummary";

/* ------------- Field Wrapper ------------- */
type WrapperProps = {
  fieldName: string;
  label: string;
  icon: ReactNode;
  autoDetected?: boolean;
  optional?: boolean;
  hideEnhance?: boolean;
  canEdit?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void> | void;
  onEnhance?: () => void;
  isSaving?: boolean;
  isEnhancing?: boolean;
  children: ReactNode;
};

function FieldCard(p: WrapperProps) {
  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        background: "#0F0F1A",
        border: "0.5px solid #1E1E35",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2D2D4E")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E1E35")}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#94A3B8]">{p.icon}</span>
          <span className="text-sm font-medium text-[#E2E8F0]">{p.label}</span>
          {p.autoDetected && (
            <span
              className="ml-1 text-[10px] font-medium rounded px-1.5 py-0.5"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "0.5px solid rgba(124,58,237,0.25)",
                color: "#A78BFA",
              }}
            >
              Auto-detected
            </span>
          )}
          {p.optional && (
            <span
              className="ml-1 text-[10px] rounded px-1.5 py-0.5"
              style={{ background: "rgba(100,116,139,0.1)", color: "#64748B" }}
            >
              Optional
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!p.hideEnhance && p.onEnhance && (
            <button
              type="button"
              aria-label={`Enhance ${p.label} with AI`}
              onClick={p.onEnhance}
              disabled={p.isEnhancing}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-60"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "0.5px solid rgba(124,58,237,0.25)",
                color: "#A78BFA",
              }}
            >
              {p.isEnhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {p.isEnhancing ? "Enhancing..." : "Enhance"}
            </button>
          )}
          {p.canEdit !== false && !p.isEditing && (
            <button
              type="button"
              aria-label={`Edit ${p.label}`}
              onClick={p.onEdit}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition"
              style={{ background: "transparent", border: "0.5px solid #1E1E35", color: "#94A3B8" }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {p.isEditing && (
            <>
              <button
                type="button"
                aria-label={`Save ${p.label}`}
                onClick={() => p.onSave()}
                disabled={p.isSaving}
                className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                style={{ background: "#7C3AED" }}
              >
                {p.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {p.isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                aria-label={`Cancel editing ${p.label}`}
                onClick={p.onCancel}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition"
                style={{ background: "transparent", border: "0.5px solid #1E1E35", color: "#94A3B8" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-3.5">{p.children}</div>
    </div>
  );
}

/* ------------- AI Modal ------------- */
function AIEnhanceModal({
  open, onOpenChange, fieldLabel, originalText, enhancedText, loading, error,
  onUse, onRetry,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fieldLabel: string;
  originalText: string;
  enhancedText: string | null;
  loading: boolean;
  error: string | null;
  onUse: () => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        style={{ background: "#1A1A2E", border: "0.5px solid #1E1E35", borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#E2E8F0]">
            <Sparkles className="h-4 w-4 text-[#A78BFA]" />
            AI Enhanced {fieldLabel}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA] mx-auto" />
            <div className="mt-3 text-sm text-[#94A3B8]">Enhancing with AI...</div>
            <div className="mt-1 text-xs text-[#64748B]">This usually takes a few seconds</div>
          </div>
        ) : error ? (
          <div className="py-6">
            <div className="text-sm text-[#94A3B8]" role="alert">{error}</div>
            <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">Try Again</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#64748B]">Original</div>
              <div
                className="mt-1 rounded-lg p-3 text-[13px] text-[#94A3B8] whitespace-pre-wrap"
                style={{ background: "#0F0F1A" }}
              >
                {originalText || <em className="text-[#64748B]">(empty)</em>}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#A78BFA]">AI Enhanced</div>
              <div
                className="mt-1 rounded-lg p-3 text-[13px] text-[#E2E8F0] whitespace-pre-wrap"
                style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)" }}
              >
                {enhancedText}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="text-xs text-[#A78BFA] hover:underline"
              >
                Try Again
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Keep Original</Button>
                <Button size="sm" onClick={onUse} className="bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white">
                  Use Enhanced Version
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------- Generic input styles ------------- */
const inputStyle: React.CSSProperties = {
  background: "#080814",
  border: "0.5px solid #1E1E35",
  color: "#E2E8F0",
};

/* ------------- Main Component ------------- */
export function EditableBrandSummary({
  initialFromAnalysis,
}: {
  initialFromAnalysis?: {
    url?: string | null;
    title?: string | null;
    description?: string | null;
    summary?: string | null;
    branding?: any;
    links?: string[];
  } | null;
}) {
  const { query, update, enhance, detect } = useBrandSummary();
  const qc = useQueryClient();
  const data = query.data?.data;

  // ---- AI Modal state ----
  const [aiOpen, setAiOpen] = useState(false);
  const [aiField, setAiField] = useState<string>("");
  const [aiLabel, setAiLabel] = useState<string>("");
  const [aiOriginal, setAiOriginal] = useState<string>("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Apply enhanced value back to a specific field
  const aiApplyRef = useRef<((v: string) => void) | null>(null);

  const runEnhance = (field: string, label: string, currentValue: string, onApply: (v: string) => void) => {
    setAiField(field); setAiLabel(label); setAiOriginal(currentValue);
    setAiResult(null); setAiError(null); setAiOpen(true);
    aiApplyRef.current = onApply;
    enhance.mutate(
      { field, current_value: currentValue },
      {
        onSuccess: (res) => {
          if (res.success && res.enhanced_value) setAiResult(res.enhanced_value);
          else setAiError(res.message || "AI enhancement is temporarily unavailable. Please try again.");
        },
        onError: () => setAiError("AI enhancement is temporarily unavailable. Please try again."),
      },
    );
  };

  // ---- Edit lock: only one field at a time ----
  const [editingField, setEditingField] = useState<string | null>(null);
  const requestEdit = (field: string) => {
    if (editingField && editingField !== field) {
      const ok = window.confirm("You have unsaved changes. Discard them?");
      if (!ok) return;
    }
    setEditingField(field);
  };
  const stopEdit = () => setEditingField(null);

  // ---- Seed / reset whenever the analyzed URL changes ----
  // Guarantees a freshly analyzed brand fully replaces the previous brand's
  // data (logo, tagline, values, aesthetic, colors, copy, links) instead of
  // leaving stale fields from the prior analysis on screen.
  const lastSeededUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data || !initialFromAnalysis?.url) return;
    const incomingUrl = initialFromAnalysis.url;
    if (lastSeededUrlRef.current === incomingUrl) return;

    const rowIsEmpty =
      !data.brand_name && !data.ai_summary && !data.logo_url &&
      (!data.brand_colors || data.brand_colors.length === 0) &&
      (!data.typography || data.typography.length === 0);
    const isDifferentBrand = (data.website_url ?? null) !== incomingUrl;
    if (!rowIsEmpty && !isDifferentBrand) {
      lastSeededUrlRef.current = incomingUrl;
      return;
    }
    lastSeededUrlRef.current = incomingUrl;

    const branding = initialFromAnalysis.branding ?? {};
    const colors: BrandColor[] = branding?.colors
      ? Object.entries(branding.colors)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => ({ role: k, label: k.replace(/([A-Z])/g, " $1").trim(), hex: String(v) }))
      : [];
    const fonts: TypographyEntry[] = Array.isArray(branding?.fonts)
      ? branding.fonts.slice(0, 6).map((f: any, i: number) => ({
          font: f?.family ?? "",
          usage: i === 0 ? "Used for headings" : i === 1 ? "Used for body text" : "Used for UI elements",
        }))
      : [];

    // Use the real logo from the firecrawl branding payload that came back with
    // the analysis. Do NOT fall back to favicon — favicons are rarely the actual
    // brand logo and cause the "wrong logo" issue on repeat searches. If no real
    // logo is in the payload, leave it empty and let detectBrandAssets find it.
    const instantLogo: string | null =
      (typeof branding?.logo === "string" && branding.logo) ||
      (typeof branding?.images?.logo === "string" && branding.images.logo) ||
      null;

    // 1) IMMEDIATELY clear the cached row in React Query so the previous brand's
    //    logo / fields cannot flash on screen while the upsert round-trips.
    const cleared: BrandSummary = {
      ...(data as BrandSummary),
      website_url: incomingUrl,
      brand_name: null,
      page_title: initialFromAnalysis.title ?? null,
      meta_description: initialFromAnalysis.description ?? null,
      ai_summary: initialFromAnalysis.summary ?? null,
      brand_colors: colors,
      typography: fonts,
      outbound_links: (initialFromAnalysis.links ?? []).slice(0, 100),
      logo_url: instantLogo,
      logo_user_uploaded: false,
      logo_storage_path: null,
      tagline: null,
      brand_values: [],
      brand_aesthetic: null,
      brand_tone: null,
      brand_archetype: null,
    };
    qc.setQueryData(["brand-summary"], { data: cleared });

    // 2) Persist the reset to the database.
    update.mutate({
      website_url: incomingUrl,
      brand_name: null,
      page_title: initialFromAnalysis.title ?? null,
      meta_description: initialFromAnalysis.description ?? null,
      ai_summary: initialFromAnalysis.summary ?? null,
      brand_colors: colors,
      typography: fonts,
      outbound_links: (initialFromAnalysis.links ?? []).slice(0, 100),
      logo_url: instantLogo,
      logo_user_uploaded: false,
      logo_storage_path: null,
      tagline: null,
      brand_values: [],
      brand_aesthetic: null,
      brand_tone: null,
      brand_archetype: null,
    });

    // 3) Kick off AI detection for the richer fields and an exact-match logo.
    //    detectBrandAssets only overwrites fields it actually finds.
    detect.mutate({
      url: incomingUrl,
      detect: ["logo", "tagline", "brand_values", "brand_aesthetic"],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.website_url, initialFromAnalysis?.url]);

  if (query.isLoading) {
    return <div className="h-32 rounded-xl bg-white/[0.04] animate-pulse" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <LogoField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} detect={detect} />

      <SimpleTextField field="brand_name" label="Brand Name" icon={<Sparkles className="h-4 w-4" />}
        value={data.brand_name ?? ""} maxLength={100}
        editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <TaglineField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <SimpleTextField field="website_url" label="Website URL" icon={<Globe className="h-4 w-4" />}
        value={data.website_url ?? ""} maxLength={2000} hideEnhance type="url"
        editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <SimpleTextField field="page_title" label="Page Title" icon={<FileText className="h-4 w-4" />}
        value={data.page_title ?? ""} maxLength={60}
        editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <TextAreaField field="meta_description" label="Meta Description" icon={<FileText className="h-4 w-4" />}
        value={data.meta_description ?? ""} maxLength={160}
        editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <TextAreaField field="ai_summary" label="What Your Website Says About Your Business"
        icon={<FileText className="h-4 w-4" />} value={data.ai_summary ?? ""} maxLength={1000} minRows={5}
        editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <BrandValuesField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <TextAreaField field="brand_aesthetic" label="Brand Aesthetic" icon={<PaletteIcon className="h-4 w-4" />}
        value={data.brand_aesthetic ?? ""} maxLength={300} minRows={3} autoDetected
        editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <BrandColorsField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} />

      <TypographyField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} />

      <BrandToneField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <BrandArchetypeField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} onEnhance={runEnhance} />

      <OutboundLinksField data={data} editingField={editingField} requestEdit={requestEdit} stopEdit={stopEdit}
        update={update} />

      <AIEnhanceModal
        open={aiOpen}
        onOpenChange={(v) => { setAiOpen(v); if (!v) setAiResult(null); }}
        fieldLabel={aiLabel}
        originalText={aiOriginal}
        enhancedText={aiResult}
        loading={enhance.isPending}
        error={aiError}
        onUse={() => {
          if (aiResult && aiApplyRef.current) aiApplyRef.current(aiResult);
          setAiOpen(false);
        }}
        onRetry={() => {
          setAiResult(null); setAiError(null);
          enhance.mutate(
            { field: aiField, current_value: aiOriginal },
            {
              onSuccess: (res) => {
                if (res.success && res.enhanced_value) setAiResult(res.enhanced_value);
                else setAiError(res.message || "AI enhancement failed. Please try again.");
              },
              onError: () => setAiError("AI enhancement failed. Please try again."),
            },
          );
        }}
      />
    </div>
  );
}

/* =================== Field Components =================== */
type FieldCommon = {
  data: BrandSummary;
  editingField: string | null;
  requestEdit: (f: string) => void;
  stopEdit: () => void;
  update: ReturnType<typeof useBrandSummary>["update"];
  onEnhance?: (field: string, label: string, currentValue: string, onApply: (v: string) => void) => void;
};

/* ---- Simple text field (single line) ---- */
function SimpleTextField({
  field, label, icon, value, maxLength, hideEnhance, type = "text",
  editingField, requestEdit, stopEdit, update, onEnhance,
}: {
  field: string; label: string; icon: ReactNode; value: string; maxLength?: number;
  hideEnhance?: boolean; type?: "text" | "url";
} & Omit<FieldCommon, "data">) {
  const isEditing = editingField === field;
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value, isEditing]);
  const save = async () => {
    await update.mutateAsync({ [field]: local } as any);
    toast.success("Saved");
    stopEdit();
  };
  return (
    <FieldCard
      fieldName={field} label={label} icon={icon}
      hideEnhance={hideEnhance}
      isEditing={isEditing}
      onEdit={() => requestEdit(field)}
      onCancel={() => { setLocal(value); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
      onEnhance={hideEnhance ? undefined : () => onEnhance?.(field, label, value, async (v) => {
        await update.mutateAsync({ [field]: v } as any);
      })}
    >
      {isEditing ? (
        <Input
          type={type}
          value={local}
          maxLength={maxLength}
          aria-label={label}
          onChange={(e) => setLocal(e.target.value)}
          style={inputStyle}
        />
      ) : (
        <div className="text-sm text-[#E2E8F0] break-words">
          {value || <span className="text-[#64748B] italic">Not set</span>}
        </div>
      )}
    </FieldCard>
  );
}

/* ---- Textarea field ---- */
function TextAreaField({
  field, label, icon, value, maxLength, minRows = 3, autoDetected,
  editingField, requestEdit, stopEdit, update, onEnhance,
}: {
  field: string; label: string; icon: ReactNode; value: string; maxLength?: number;
  minRows?: number; autoDetected?: boolean;
} & Omit<FieldCommon, "data">) {
  const isEditing = editingField === field;
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value, isEditing]);
  const save = async () => {
    await update.mutateAsync({ [field]: local } as any);
    toast.success("Saved");
    stopEdit();
  };
  return (
    <FieldCard
      fieldName={field} label={label} icon={icon} autoDetected={autoDetected}
      isEditing={isEditing}
      onEdit={() => requestEdit(field)}
      onCancel={() => { setLocal(value); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
      onEnhance={() => onEnhance?.(field, label, value, async (v) => {
        await update.mutateAsync({ [field]: v } as any);
      })}
    >
      {isEditing ? (
        <div>
          <Textarea
            value={local}
            maxLength={maxLength}
            aria-label={label}
            onChange={(e) => setLocal(e.target.value)}
            style={{ ...inputStyle, minHeight: minRows * 24 }}
          />
          {maxLength && (
            <div className="mt-1 text-[11px] text-[#64748B] text-right">{local.length} / {maxLength}</div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-wrap">
          {value || <span className="text-[#64748B] italic">Not set</span>}
        </p>
      )}
    </FieldCard>
  );
}

/* ---- Logo ---- */
function LogoField({ data, editingField, requestEdit, stopEdit, update, detect }: FieldCommon & { detect: ReturnType<typeof useBrandSummary>["detect"] }) {
  const isEditing = editingField === "logo";
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => { setPreview(null); setFile(null); };

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    if (!/^image\//.test(f.type)) { toast.error("Unsupported file type"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (file) {
      setUploading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) throw new Error("Not signed in");
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${uid}/logo.${ext}`;
        const up = await supabase.storage.from("brand-logos").upload(path, file, { upsert: true, contentType: file.type });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("brand-logos").createSignedUrl(path, 60 * 60 * 24 * 365);
        await update.mutateAsync({ logo_url: signed?.signedUrl ?? null, logo_user_uploaded: true, logo_storage_path: path } as any);
        toast.success("Logo saved");
        reset(); stopEdit();
      } catch (e: any) {
        toast.error(e?.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
    } else {
      stopEdit();
    }
  };

  const redetect = async () => {
    if (!data.website_url) { toast.error("Set a website URL first"); return; }
    try {
      await detect.mutateAsync({ url: data.website_url, detect: ["logo"] });
      toast.success("Re-detected from website");
    } catch {
      toast.error("Detection failed");
    }
  };

  return (
    <FieldCard
      fieldName="logo" label="Logo" icon={<ImageIcon className="h-4 w-4" />}
      autoDetected={!data.logo_user_uploaded && !!data.logo_url}
      hideEnhance
      isEditing={isEditing}
      onEdit={() => requestEdit("logo")}
      onCancel={() => { reset(); stopEdit(); }}
      onSave={save}
      isSaving={uploading}
    >
      {!isEditing ? (
        data.logo_url ? (
          <div className="inline-flex flex-col items-start">
            <div className="rounded-lg p-3" style={{ background: "#111122" }}>
              <img src={data.logo_url} alt="Brand logo" style={{ maxWidth: 200, maxHeight: 80, objectFit: "contain" }} />
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">
              {data.logo_user_uploaded ? "User uploaded" : "Auto-detected"}
            </div>
          </div>
        ) : (
          <div
            className="text-center rounded-xl py-6 px-4"
            style={{ border: "1.5px dashed #1E1E35" }}
          >
            <div className="text-sm text-[#94A3B8]">No logo detected</div>
            <div className="text-xs text-[#64748B] mt-1">Click Edit to upload your logo</div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {(preview || data.logo_url) && (
            <img src={preview || data.logo_url!} alt="" style={{ maxWidth: 100, maxHeight: 60, objectFit: "contain" }} />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)", color: "#A78BFA" }}
            >
              <Upload className="h-3.5 w-3.5" /> Upload Logo
            </button>
            <Button variant="outline" size="sm" onClick={redetect} disabled={detect.isPending}>
              {detect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Re-detect from website
            </Button>
          </div>
          <div
            className="rounded-xl py-5 px-4 text-center cursor-pointer"
            style={{ border: "1.5px dashed #1E1E35" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-xs text-[#94A3B8]">or drag and drop your logo here</div>
            <div className="text-[11px] text-[#64748B] mt-1">PNG, JPG, WebP, SVG — max 5MB</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            aria-label="Upload brand logo"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}
    </FieldCard>
  );
}

/* ---- Tagline ---- */
function TaglineField({ data, editingField, requestEdit, stopEdit, update, onEnhance }: FieldCommon) {
  const isEditing = editingField === "tagline";
  const [local, setLocal] = useState(data.tagline ?? "");
  useEffect(() => { setLocal(data.tagline ?? ""); }, [data.tagline, isEditing]);
  const save = async () => { await update.mutateAsync({ tagline: local } as any); toast.success("Saved"); stopEdit(); };
  return (
    <FieldCard
      fieldName="tagline" label="Tagline" icon={<Quote className="h-4 w-4" />} autoDetected
      isEditing={isEditing}
      onEdit={() => requestEdit("tagline")}
      onCancel={() => { setLocal(data.tagline ?? ""); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
      onEnhance={() => onEnhance?.("tagline", "Tagline", data.tagline ?? "", async (v) => {
        await update.mutateAsync({ tagline: v } as any);
      })}
    >
      {isEditing ? (
        <div>
          <Input
            value={local}
            maxLength={150}
            placeholder="Enter your brand tagline..."
            onChange={(e) => setLocal(e.target.value)}
            style={inputStyle}
            aria-label="Tagline"
          />
          <div className="mt-1 text-[11px] text-[#64748B] text-right">{local.length} / 150</div>
        </div>
      ) : data.tagline ? (
        <p className="text-base italic text-[#E2E8F0]">{`"${data.tagline}"`}</p>
      ) : (
        <p className="text-sm text-[#94A3B8]">No tagline detected — click Edit to add one</p>
      )}
    </FieldCard>
  );
}

/* ---- Brand Values ---- */
function BrandValuesField({ data, editingField, requestEdit, stopEdit, update, onEnhance }: FieldCommon) {
  const isEditing = editingField === "brand_values";
  const values = data.brand_values ?? [];
  const [local, setLocal] = useState<string[]>(values);
  const [input, setInput] = useState("");
  useEffect(() => { setLocal(values); setInput(""); }, [data.brand_values, isEditing]);
  const save = async () => { await update.mutateAsync({ brand_values: local } as any); toast.success("Saved"); stopEdit(); };
  const addOne = (v: string) => {
    const t = v.trim();
    if (!t || local.includes(t)) return;
    if (local.length >= 8) return;
    setLocal([...local, t]);
  };
  return (
    <FieldCard
      fieldName="brand_values" label="Brand Values" icon={<Heart className="h-4 w-4" />} autoDetected
      isEditing={isEditing}
      onEdit={() => requestEdit("brand_values")}
      onCancel={() => { setLocal(values); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
      onEnhance={() => onEnhance?.("brand_values", "Brand Values", values.join(", "), async (v) => {
        const arr = v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
        await update.mutateAsync({ brand_values: arr } as any);
      })}
    >
      {isEditing ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            {local.map((v, i) => (
              <span key={`${v}-${i}`}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium"
                style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)", color: "#A78BFA" }}
              >
                {v}
                <button type="button" onClick={() => setLocal(local.filter((_, j) => j !== i))} aria-label={`Remove ${v}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={input}
            placeholder="Press Enter to add a brand value..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addOne(input); setInput(""); }
              else if (e.key === "Backspace" && !input && local.length) setLocal(local.slice(0, -1));
            }}
            style={inputStyle}
          />
          {local.length >= 8 && <div className="mt-1 text-[11px] text-[#F59E0B]">Maximum 8 brand values</div>}
        </div>
      ) : values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span key={`${v}-${i}`}
              className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium"
              style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)", color: "#A78BFA" }}
            >{v}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#94A3B8]">No brand values detected — click Edit to add</p>
      )}
    </FieldCard>
  );
}

/* ---- Brand Colors ---- */
function BrandColorsField({ data, editingField, requestEdit, stopEdit, update }: FieldCommon) {
  const isEditing = editingField === "brand_colors";
  const colors = data.brand_colors ?? [];
  const [local, setLocal] = useState<BrandColor[]>(colors);
  useEffect(() => { setLocal(colors); }, [data.brand_colors, isEditing]);
  const save = async () => { await update.mutateAsync({ brand_colors: local } as any); toast.success("Saved"); stopEdit(); };

  return (
    <FieldCard
      fieldName="brand_colors" label="Brand Colors" icon={<PaletteIcon className="h-4 w-4" />}
      hideEnhance
      isEditing={isEditing}
      onEdit={() => requestEdit("brand_colors")}
      onCancel={() => { setLocal(colors); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
    >
      {!isEditing ? (
        colors.length === 0 ? (
          <div className="text-xs text-[#94A3B8]">No palette detected.</div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {colors.map((c, i) => (
              <button
                type="button"
                key={`${c.hex}-${i}`}
                onClick={() => { navigator.clipboard.writeText(c.hex); toast.success(`Copied ${c.hex}`); }}
                className="flex flex-col items-center w-24"
              >
                <div className="h-14 w-14 rounded-full border border-white/15 shadow-inner" style={{ background: c.hex }} />
                <div className="mt-2 text-xs font-medium capitalize text-center text-[#94A3B8]">{c.label || c.role}</div>
                <div className="text-[11px] font-mono text-[#64748B]">{c.hex}</div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {local.map((c, i) => (
            <ColorEditRow
              key={i}
              color={c}
              onChange={(next) => setLocal(local.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setLocal(local.filter((_, j) => j !== i))}
              isLast={i === local.length - 1}
            />
          ))}
          <button
            type="button"
            onClick={() => setLocal([...local, { role: "custom", label: "", hex: "#7C3AED", user_customized: true }])}
            className="text-[13px] text-[#A78BFA] hover:underline"
          >
            + Add color
          </button>
        </div>
      )}
    </FieldCard>
  );
}

function ColorEditRow({ color, onChange, onRemove, isLast }: {
  color: BrandColor; onChange: (c: BrandColor) => void; onRemove: () => void; isLast: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: isLast ? "none" : "0.5px solid #1E1E35" }}>
      <div className="relative">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          aria-label={`Color picker for ${color.label || color.role}`}
          style={{
            width: 56, height: 56, borderRadius: 10, background: color.hex,
            border: "2px solid #1E1E35",
          }}
        />
        <input
          ref={ref} type="color" value={color.hex}
          onChange={(e) => onChange({ ...color, hex: e.target.value, user_customized: true })}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
        />
      </div>
      <Input
        value={color.label}
        onChange={(e) => onChange({ ...color, label: e.target.value })}
        placeholder="Label (e.g. Primary)"
        style={{ ...inputStyle, width: 160 }}
      />
      <span className="text-xs font-mono text-[#64748B]">{color.hex}</span>
      <button type="button" onClick={onRemove} className="ml-auto" aria-label="Remove color">
        <Trash2 className="h-3.5 w-3.5 text-[#64748B] hover:text-[#EF4444]" />
      </button>
    </div>
  );
}

/* ---- Typography ---- */
function TypographyField({ data, editingField, requestEdit, stopEdit, update }: FieldCommon) {
  const isEditing = editingField === "typography";
  const fonts = data.typography ?? [];
  const [local, setLocal] = useState<TypographyEntry[]>(fonts);
  useEffect(() => { setLocal(fonts); }, [data.typography, isEditing]);
  const save = async () => { await update.mutateAsync({ typography: local } as any); toast.success("Saved"); stopEdit(); };
  const USAGES = ["Used for headings", "Used for body text", "Used for UI elements"];
  return (
    <FieldCard
      fieldName="typography" label="Typography" icon={<Type className="h-4 w-4" />}
      hideEnhance
      isEditing={isEditing}
      onEdit={() => requestEdit("typography")}
      onCancel={() => { setLocal(fonts); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
    >
      {!isEditing ? (
        fonts.length === 0 ? (
          <div className="text-xs text-[#94A3B8]">No fonts detected.</div>
        ) : (
          <ul className="space-y-2.5">
            {fonts.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "#080814", border: "0.5px solid #1E1E35" }}>
                <span className="text-sm text-[#E2E8F0]" style={{ fontFamily: f.font || undefined }}>{f.font || "—"}</span>
                <span className="text-[11px] text-[#64748B]">{f.usage}</span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-2">
          {local.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={f.font}
                placeholder="Font name"
                onChange={(e) => setLocal(local.map((x, j) => j === i ? { ...x, font: e.target.value } : x))}
                style={inputStyle}
              />
              <select
                value={f.usage}
                onChange={(e) => setLocal(local.map((x, j) => j === i ? { ...x, usage: e.target.value } : x))}
                className="rounded-md px-2 py-2 text-sm"
                style={{ ...inputStyle, minWidth: 180 }}
              >
                {USAGES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" onClick={() => setLocal(local.filter((_, j) => j !== i))} aria-label="Remove font">
                <Trash2 className="h-3.5 w-3.5 text-[#64748B] hover:text-[#EF4444]" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLocal([...local, { font: "", usage: USAGES[0] }])}
            className="text-[13px] text-[#A78BFA] hover:underline"
          >
            + Add font
          </button>
        </div>
      )}
    </FieldCard>
  );
}

/* ---- Brand Tone ---- */
function BrandToneField({ data, editingField, requestEdit, stopEdit, update, onEnhance }: FieldCommon) {
  const isEditing = editingField === "brand_tone";
  const [tone, setTone] = useState<string>(data.brand_tone ?? "");
  const [custom, setCustom] = useState<string>(data.brand_tone_is_custom ? (data.brand_tone ?? "") : "");
  useEffect(() => {
    setTone(data.brand_tone ?? "");
    setCustom(data.brand_tone_is_custom ? (data.brand_tone ?? "") : "");
  }, [data.brand_tone, data.brand_tone_is_custom, isEditing]);
  const save = async () => {
    const value = custom.trim() || tone;
    const isCustom = !!custom.trim();
    await update.mutateAsync({ brand_tone: value || null, brand_tone_is_custom: isCustom } as any);
    toast.success("Saved");
    stopEdit();
  };
  return (
    <FieldCard
      fieldName="brand_tone" label="Brand Tone" icon={<MessageCircle className="h-4 w-4" />} optional
      isEditing={isEditing}
      onEdit={() => requestEdit("brand_tone")}
      onCancel={() => stopEdit()}
      onSave={save}
      isSaving={update.isPending && isEditing}
      onEnhance={() => onEnhance?.("brand_tone", "Brand Tone", data.brand_tone ?? "", async (v) => {
        await update.mutateAsync({ brand_tone: v, brand_tone_is_custom: !BRAND_TONE_OPTIONS.includes(v as any) } as any);
      })}
    >
      {!isEditing ? (
        data.brand_tone ? (
          <span
            className="inline-flex items-center rounded-full px-3.5 py-1 text-sm font-medium"
            style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)", color: "#A78BFA" }}
          >{data.brand_tone}</span>
        ) : (
          <p className="text-sm text-[#94A3B8]">Not set — click Edit to select your brand tone</p>
        )
      ) : (
        <div className="space-y-3">
          <select
            value={tone}
            onChange={(e) => { setTone(e.target.value); setCustom(""); }}
            aria-label="Brand tone"
            className="w-full rounded-lg px-3 py-2.5 text-sm"
            style={inputStyle}
          >
            <option value="">— Select a tone —</option>
            {BRAND_TONE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <div>
            <div className="text-[12px] text-[#64748B] mb-1">Or type a custom brand tone:</div>
            <Input
              value={custom}
              placeholder="e.g. Witty and conversational"
              onChange={(e) => setCustom(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </FieldCard>
  );
}

/* ---- Brand Archetype ---- */
function BrandArchetypeField({ data, editingField, requestEdit, stopEdit, update, onEnhance }: FieldCommon) {
  const isEditing = editingField === "brand_archetype";
  const [arch, setArch] = useState<string>(data.brand_archetype ?? "");
  const [custom, setCustom] = useState<string>(data.brand_archetype_is_custom ? (data.brand_archetype ?? "") : "");
  useEffect(() => {
    setArch(data.brand_archetype ?? "");
    setCustom(data.brand_archetype_is_custom ? (data.brand_archetype ?? "") : "");
  }, [data.brand_archetype, data.brand_archetype_is_custom, isEditing]);
  const description = useMemo(
    () => BRAND_ARCHETYPE_OPTIONS.find((a) => a.name === data.brand_archetype)?.description,
    [data.brand_archetype],
  );
  const save = async () => {
    const value = custom.trim() || arch;
    const isCustom = !!custom.trim();
    await update.mutateAsync({ brand_archetype: value || null, brand_archetype_is_custom: isCustom } as any);
    toast.success("Saved");
    stopEdit();
  };
  return (
    <FieldCard
      fieldName="brand_archetype" label="Brand Archetype" icon={<UserCheck className="h-4 w-4" />} optional
      isEditing={isEditing}
      onEdit={() => requestEdit("brand_archetype")}
      onCancel={() => stopEdit()}
      onSave={save}
      isSaving={update.isPending && isEditing}
      onEnhance={() => onEnhance?.("brand_archetype", "Brand Archetype", data.brand_archetype ?? "", async (v) => {
        const isPredef = BRAND_ARCHETYPE_OPTIONS.some((a) => a.name === v);
        await update.mutateAsync({ brand_archetype: v, brand_archetype_is_custom: !isPredef } as any);
      })}
    >
      {!isEditing ? (
        data.brand_archetype ? (
          <div>
            <span
              className="inline-flex items-center rounded-full px-3.5 py-1 text-sm font-medium"
              style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)", color: "#A78BFA" }}
            >{data.brand_archetype}</span>
            {description && <div className="text-xs italic text-[#94A3B8] mt-1.5">{description}</div>}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">Not set — click Edit to select your brand archetype</p>
        )
      ) : (
        <div className="space-y-3">
          <div className="max-h-72 overflow-y-auto rounded-lg" style={{ background: "#080814", border: "0.5px solid #1E1E35" }}>
            {BRAND_ARCHETYPE_OPTIONS.map((a) => {
              const selected = arch === a.name;
              return (
                <button
                  type="button"
                  key={a.name}
                  role="option"
                  aria-selected={selected}
                  onClick={() => { setArch(a.name); setCustom(""); }}
                  className="w-full text-left px-3 py-2 transition"
                  style={{
                    background: selected ? "rgba(124,58,237,0.08)" : "transparent",
                    borderLeft: selected ? "3px solid #7C3AED" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="text-sm font-medium text-[#E2E8F0]">{a.name}</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">{a.description}</div>
                </button>
              );
            })}
          </div>
          <div>
            <div className="text-[12px] text-[#64748B] mb-1">Or type a custom brand archetype:</div>
            <Input
              value={custom}
              placeholder="e.g. The Disruptor"
              onChange={(e) => setCustom(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </FieldCard>
  );
}

/* ---- Outbound Links ---- */
function OutboundLinksField({ data, editingField, requestEdit, stopEdit, update }: FieldCommon) {
  const isEditing = editingField === "outbound_links";
  const links = data.outbound_links ?? [];
  const [local, setLocal] = useState<string[]>(links);
  useEffect(() => { setLocal(links); }, [data.outbound_links, isEditing]);
  const save = async () => {
    const cleaned = local.map((s) => s.trim()).filter(Boolean);
    await update.mutateAsync({ outbound_links: cleaned } as any);
    toast.success("Saved");
    stopEdit();
  };
  return (
    <FieldCard
      fieldName="outbound_links" label="Where Your Website Links To" icon={<LinkIcon className="h-4 w-4" />}
      hideEnhance
      isEditing={isEditing}
      onEdit={() => requestEdit("outbound_links")}
      onCancel={() => { setLocal(links); stopEdit(); }}
      onSave={save}
      isSaving={update.isPending && isEditing}
    >
      {!isEditing ? (
        links.length === 0 ? (
          <div className="text-xs text-[#94A3B8]">No outbound links.</div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-auto pr-1">
            {links.slice(0, 50).map((l, i) => (
              <a key={`${l}-${i}`} href={l} target="_blank" rel="noreferrer"
                className="block text-[12px] text-[#94A3B8] hover:text-[#A78BFA] truncate">{l}</a>
            ))}
            {links.length > 50 && <div className="text-[11px] text-[#64748B]">+ {links.length - 50} more</div>}
          </div>
        )
      ) : (
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {local.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={l}
                onChange={(e) => setLocal(local.map((x, j) => j === i ? e.target.value : x))}
                style={inputStyle}
              />
              <button type="button" onClick={() => setLocal(local.filter((_, j) => j !== i))} aria-label="Remove link">
                <Trash2 className="h-3.5 w-3.5 text-[#64748B] hover:text-[#EF4444]" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLocal([...local, ""])}
            className="text-[13px] text-[#A78BFA] hover:underline"
          >
            + Add link
          </button>
        </div>
      )}
    </FieldCard>
  );
}
