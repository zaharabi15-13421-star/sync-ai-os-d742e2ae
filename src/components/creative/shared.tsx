import React, { ReactNode, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Wand2, RotateCcw, RotateCw, Copy, Download, Send, RefreshCw,
  FlaskConical, Plus, X, Search, Loader2, Image as ImageIcon, Check,
  Paperclip, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ASPECT_RATIOS, PLATFORMS, TONE_PRESETS, COLOR_PALETTES,
} from "@/lib/creative-mock";
import {
  enhancePrompt,
  generateSeoKeywords,
  critiqueContent,
  listGenerations,
} from "@/lib/creative.functions";


// ====== Section card ======
export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs font-medium text-foreground/80">{children}</label>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ====== Prompt input with AI actions + tone presets + undo/redo ======
export type PromptAttachment = {
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  kind: "image" | "file";
};

async function fileToAttachment(file: File): Promise<PromptAttachment> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    dataUrl,
    size: file.size,
    kind: (file.type || "").startsWith("image/") ? "image" : "file",
  };
}

export function PromptInput({
  value, onChange, placeholder, rows = 4, label = "Prompt",
  tone, onToneChange,
  attachments: attachmentsProp, onAttachmentsChange,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  tone?: string;
  onToneChange?: (t: string) => void;
  attachments?: PromptAttachment[];
  onAttachmentsChange?: (a: PromptAttachment[]) => void;
}) {
  const [history, setHistory] = useState<string[]>([value]);
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [customTones, setCustomTones] = useState<string[]>([]);
  const [internalAtts, setInternalAtts] = useState<PromptAttachment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const attachments = attachmentsProp ?? internalAtts;
  const setAttachments = (a: PromptAttachment[]) => {
    if (!attachmentsProp) setInternalAtts(a);
    onAttachmentsChange?.(a);
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    try {
      const parsed = await Promise.all(Array.from(list).slice(0, 5).map(fileToAttachment));
      setAttachments([...attachments, ...parsed].slice(0, 5));
      toast.success(`${parsed.length} file${parsed.length > 1 ? "s" : ""} attached`);
    } catch (e) {
      toast.error("Failed to attach file");
    }
  };

  const push = (next: string) => {
    const trimmed = history.slice(0, cursor + 1);
    setHistory([...trimmed, next]);
    setCursor(trimmed.length);
    onChange(next);
  };

  const undo = () => {
    if (cursor > 0) {
      setCursor(cursor - 1);
      onChange(history[cursor - 1]);
    }
  };
  const redo = () => {
    if (cursor < history.length - 1) {
      setCursor(cursor + 1);
      onChange(history[cursor + 1]);
    }
  };

  const runAction = async (action: "Enhance" | "Rewrite" | "Expand" | "Shorten") => {
    setBusy(action);
    try {
      const result = await enhancePrompt({ data: { text: value, action } });
      push(result.enhancedText);
      toast.success(`${action}d with AI`);
    } catch (error) {
      console.error("Enhance failed:", error);
      toast.error("Failed to enhance. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const allTones = [...TONE_PRESETS, ...customTones];

  return (
    <div>
      <FieldLabel hint={`${value.length} chars`}>{label}</FieldLabel>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value !== history[cursor]) {
              const next = history.slice(0, cursor + 1);
              setHistory([...next, e.target.value]);
              setCursor(next.length);
            }
          }}
          placeholder={placeholder || "Describe what you want to create..."}
          rows={rows}
          className="bg-white/5 border-white/10 resize-none pl-10"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.docx"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
        />
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Add attachments"
              className="absolute left-2 top-2 h-7 w-7 rounded-full bg-white/10 hover:bg-indigo-500/30 border border-white/15 hover:border-indigo-400/50 flex items-center justify-center text-foreground/80 hover:text-indigo-200 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1.5">
            <button
              type="button"
              onClick={() => { setAttachOpen(false); fileInputRef.current?.click(); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs hover:bg-white/10 text-left"
            >
              <Paperclip className="h-3.5 w-3.5 text-indigo-300" />
              <div>
                <div className="font-medium">Add Photos & Files</div>
                <div className="text-[10px] text-muted-foreground">Images, PDFs, docs (max 5)</div>
              </div>
            </button>
          </PopoverContent>
        </Popover>
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {attachments.map((a, i) => (
            <div key={i} className="group relative flex items-center gap-1.5 rounded-md bg-white/5 border border-white/10 pl-1 pr-2 py-1 text-[10px]">
              {a.kind === "image" ? (
                <img src={a.dataUrl} alt={a.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <FileText className="h-4 w-4 text-indigo-300 mx-1" />
              )}
              <span className="truncate max-w-32">{a.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-rose-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {(["Enhance", "Rewrite", "Expand", "Shorten"] as const).map((a) => (
          <Button
            key={a} type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs bg-white/5 border border-white/10 hover:bg-white/10"
            onClick={() => runAction(a)} disabled={busy !== null}
          >
            {busy === a ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {a}
          </Button>
        ))}
        <div className="ml-auto flex gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={undo} disabled={cursor === 0} title="Undo">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={redo} disabled={cursor >= history.length - 1} title="Redo">
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {onToneChange && (
        <div className="mt-3">
          <FieldLabel>Tone</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {allTones.map((t) => (
              <button
                key={t} type="button" onClick={() => onToneChange(t)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs border transition-colors",
                  tone === t ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/40" : "bg-white/5 text-foreground/70 border-white/10 hover:bg-white/10"
                )}
              >{t}</button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="px-2 py-1 rounded-full text-xs border border-dashed border-white/20 text-muted-foreground hover:text-foreground">
                  <Plus className="h-3 w-3 inline" /> Add
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <AddCustom onAdd={(v) => setCustomTones([...customTones, v])} placeholder="Custom tone..." />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}

function AddCustom({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
      <Button size="sm" className="h-8" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}>Add</Button>
    </div>
  );
}

// ====== Aspect ratio selector ======
export function AspectRatioPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [w, setW] = useState(1080);
  const [h, setH] = useState(1080);
  return (
    <div>
      <FieldLabel>Aspect Ratio</FieldLabel>
      <div className="grid grid-cols-6 gap-1.5">
        {ASPECT_RATIOS.map((r) => (
          <button
            key={r.value} type="button" onClick={() => onChange(r.value)}
            title={r.label}
            className={cn(
              "px-2 py-1.5 rounded-md text-[11px] border transition-colors",
              value === r.value ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/40" : "bg-white/5 text-foreground/70 border-white/10 hover:bg-white/10"
            )}
          >{r.label}</button>
        ))}
      </div>
      {value === "custom" && (
        <div className="flex gap-2 mt-2">
          <Input type="number" value={w} onChange={(e) => setW(+e.target.value)} className="h-8 text-xs" placeholder="W" />
          <Input type="number" value={h} onChange={(e) => setH(+e.target.value)} className="h-8 text-xs" placeholder="H" />
        </div>
      )}
    </div>
  );
}

// ====== Platform multi-select ======
export function PlatformSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const filtered = PLATFORMS.filter((p) => p.toLowerCase().includes(q.toLowerCase()));
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div>
      <FieldLabel>Platforms</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="w-full text-left rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2 flex-wrap min-h-9">
            {value.length === 0 && <span className="text-muted-foreground">Select platforms...</span>}
            {value.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 text-indigo-200 px-2 py-0.5 text-[10px]">
                {p}
                <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(p); }} />
              </span>
            ))}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-7 h-8 text-xs" />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.map((p) => (
              <button key={p} type="button" onClick={() => toggle(p)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/10 text-xs">
                <span>{p}</span>
                {value.includes(p) && <Check className="h-3 w-3 text-indigo-300" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ====== Color customization (palette + custom) ======
export function ColorCustomizer({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState("#4f46e5");
  return (
    <div>
      <FieldLabel>Color Customization</FieldLabel>
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {COLOR_PALETTES.map((p) => {
            const active = JSON.stringify(value) === JSON.stringify(p.colors);
            return (
              <button key={p.name} type="button" onClick={() => onChange(p.colors)} title={p.name}
                className={cn("flex h-7 rounded overflow-hidden border", active ? "border-indigo-400 ring-1 ring-indigo-400/40" : "border-white/10")}>
                {p.colors.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)}
            className="h-8 w-10 rounded border border-white/10 bg-transparent cursor-pointer" />
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} className="h-8 text-xs font-mono" />
          <Button size="sm" className="h-8" onClick={() => onChange([...value, custom])}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        {value.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {value.map((c, i) => (
              <div key={i} className="group relative h-7 w-7 rounded border border-white/10" style={{ background: c }}>
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 hidden group-hover:flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-white">
                  <X className="h-2 w-2" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ====== File upload (drag-drop) ======
export function FileDrop({
  value, onChange, accept = "image/*", multiple = false, hint, label = "Upload",
}: {
  value: File[] | File | null;
  onChange: (v: File[] | File | null) => void;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  label?: string;
}) {
  const [drag, setDrag] = useState(false);
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    onChange(multiple ? arr : arr[0]);
  };
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          "block cursor-pointer rounded-md border-2 border-dashed px-3 py-4 text-center text-xs transition-colors",
          drag ? "border-indigo-400 bg-indigo-500/10" : "border-white/15 bg-white/5 hover:bg-white/10"
        )}
      >
        <input type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
        <ImageIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
        <div className="text-muted-foreground">
          {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Drag & drop or click to upload"}
        </div>
      </label>
      {files.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-[10px]">
              <span className="truncate max-w-32">{f.name}</span>
              <button type="button" onClick={() => {
                const rest = files.filter((_, j) => j !== i);
                onChange(multiple ? rest : rest[0] || null);
              }}>
                <X className="h-3 w-3 text-muted-foreground hover:text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ====== SEO keyword smart search (AI-powered with volume/difficulty/intent) ======
type SeoSug = { keyword: string; volume: string; difficulty: string; intent: string };

function badgeClass(kind: "volume" | "difficulty" | "intent", v: string) {
  if (kind === "intent") return "bg-indigo-500/15 text-indigo-200 border-indigo-400/30";
  const map: Record<string, string> = {
    High: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    Easy: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    Medium: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    Low: "bg-slate-500/15 text-slate-300 border-slate-400/30",
    Hard: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  };
  return map[v] || "bg-white/5 text-foreground/70 border-white/10";
}

export function SeoKeywordPicker({ value, onChange, language = "English", industry }: { value: string[]; onChange: (v: string[]) => void; language?: string; industry?: string }) {
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<SeoSug[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 3) { setSug([]); setOpen(false); return; }
    setOpen(true);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await generateSeoKeywords({ data: { query: q, count: 10, language, industry } });
        // Normalize: backend may return new shape or legacy number-volume.
        const norm: SeoSug[] = (result.keywords as any[]).map((k) => ({
          keyword: k.keyword,
          volume: typeof k.volume === "number" ? (k.volume > 10000 ? "High" : k.volume > 2000 ? "Medium" : "Low") : (k.volume || "Medium"),
          difficulty: k.difficulty || k.competition || "Medium",
          intent: k.intent || "Informational",
        }));
        setSug(norm);
      } catch (error) {
        console.error("SEO keywords failed:", error);
        setSug([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q, language, industry]);

  const addKw = (k: string) => { if (!value.includes(k) && value.length < 10) onChange([...value, k]); };

  return (
    <div>
      <FieldLabel hint={value.length >= 10 ? "Max 10 reached" : undefined}>SEO Focus Keywords</FieldLabel>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-white/5 border border-white/10 p-1.5 min-h-9 focus-within:border-indigo-400/50 focus-within:ring-1 focus-within:ring-indigo-400/40">
          {value.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 text-[11px]">
              {k}
              <X className="h-2.5 w-2.5 cursor-pointer hover:text-rose-300" onClick={() => onChange(value.filter((x) => x !== k))} />
            </span>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && q.trim()) {
                e.preventDefault();
                addKw(q.trim()); setQ(""); setSug([]); setOpen(false);
              } else if (e.key === "Backspace" && !q && value.length) {
                onChange(value.slice(0, -1));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={value.length === 0 ? "Type a keyword and press Enter, or get AI suggestions..." : ""}
            className="flex-1 min-w-44 bg-transparent outline-none text-xs px-1 py-1 text-foreground placeholder:text-muted-foreground"
            disabled={value.length >= 10}
          />
          {loading && <Loader2 className="h-3 w-3 animate-spin text-indigo-300 mr-1" />}
        </div>
        {open && (sug.length > 0 || loading) && (
          <div className="absolute z-30 mt-1 w-full rounded-lg bg-popover border border-white/10 shadow-2xl max-h-72 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">AI Keyword Suggestions</div>
            {sug.map((s) => (
              <button key={s.keyword} type="button"
                onClick={() => { addKw(s.keyword); setQ(""); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-indigo-500/10 text-left">
                <span className="text-xs font-medium text-foreground truncate">{s.keyword}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] border", badgeClass("volume", s.volume))}>{s.volume}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] border", badgeClass("difficulty", s.difficulty))}>{s.difficulty}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] border", badgeClass("intent", s.intent))}>{s.intent.slice(0, 4)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ====== Audience age picker ======
export function AudienceAge({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>Audience Age</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["15-25", "25-35", "35-45", "45-55", "55-65", "Custom Range"].map((a) =>
            <SelectItem key={a} value={a}>{a}</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ====== Searchable simple select ======
export function SearchSelect({ value, onChange, options, placeholder = "Select..." }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10 h-9">
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="h-8 text-xs mb-2" />
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {filtered.map((o) => (
            <button key={o} type="button" onClick={() => onChange(o)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 text-xs">{o}</button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ====== Output panel ======
type HistoryItem = {
  id: string;
  module: string;
  output_type: string;
  output_content: string | null;
  output_image_url: string | null;
  prompt_used: string | null;
  quality_score: number | null;
  created_at: string;
};

function ImageGenProgress({ active }: { active: boolean }) {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState("Initializing");
  useEffect(() => {
    if (!active) return;
    setPct(0);
    setPhase("Initializing");
    const start = Date.now();
    // Asymptotic curve toward 95% over ~14s — purely cosmetic, never blocks generation.
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const target = 95 * (1 - Math.exp(-elapsed / 5));
      setPct((p) => Math.max(p, Math.min(95, target)));
      if (elapsed < 1.2) setPhase("Initializing model");
      else if (elapsed < 3) setPhase("Composing scene");
      else if (elapsed < 6) setPhase("Rendering details");
      else if (elapsed < 10) setPhase("Refining lighting & color");
      else setPhase("Finalizing image");
    }, 120);
    return () => {
      window.clearInterval(id);
      setPct(100);
    };
  }, [active]);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-600/40 flex items-center justify-center mb-3">
        <Loader2 className="h-5 w-5 text-indigo-100 animate-spin" />
      </div>
      <div className="text-xs uppercase tracking-widest text-indigo-200/90">{phase}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-white">{Math.floor(pct)}%</div>
      <div className="mt-3 w-56 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-[10px] text-foreground/60">Generating your image…</div>
    </div>
  );
}

export function OutputPanel({
  loading, generated, onGenerate, children, kind = "content", contentForCritique = "",
  module: moduleId, imageUrl, textContent,
}: {
  loading: boolean;
  generated: boolean;
  onGenerate: () => void;
  children?: ReactNode;
  kind?: "image" | "content" | "text";
  contentForCritique?: string;
  module?: string;
  imageUrl?: string;
  textContent?: string;
}) {
  const [tab, setTab] = useState("v1");
  const [critique, setCritique] = useState<Awaited<ReturnType<typeof critiqueContent>> | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    if (generated && contentForCritique && kind !== "image") {
      critiqueContent({ data: { content: contentForCritique } })
        .then(setCritique)
        .catch((error) => {
          console.error("Critique failed:", error);
          setCritique(null);
        });
    } else {
      setCritique(null);
    }
  }, [generated, contentForCritique, kind]);

  // Refresh history shortly after a generation completes
  useEffect(() => {
    if (!moduleId) return;
    if (generated) {
      const t = setTimeout(() => setHistoryTick((n) => n + 1), 600);
      return () => clearTimeout(t);
    }
  }, [generated, moduleId]);

  useEffect(() => {
    if (!moduleId) return;
    listGenerations({ data: { module: moduleId, limit: 3 } })
      .then((r) => setHistory((r.items as HistoryItem[]) ?? []))
      .catch(() => setHistory([]));
  }, [moduleId, historyTick]);

  const handleCopy = async () => {
    const text = textContent || contentForCritique || imageUrl || "";
    if (!text) { toast.error("Nothing to copy yet"); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${moduleId || "creative"}-${Date.now()}.png`;
      a.click();
      toast.success("Download started");
      return;
    }
    const text = textContent || contentForCritique;
    if (!text) { toast.error("Nothing to download yet"); return; }
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moduleId || "creative"}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  };

  return (
    <div className="space-y-3 sticky top-4">
      <div className="glass rounded-xl p-3 flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="v1">V1</TabsTrigger>
            <TabsTrigger value="v2">V2</TabsTrigger>
            <TabsTrigger value="v3">V3</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!generated} onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" /> Copy
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!generated} onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" /> Download
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!generated} onClick={() => toast.success("Sent to Campaigns")}>
            <Send className="h-3 w-3 mr-1" /> Campaigns
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!generated} onClick={() => toast.success("A/B test queued")}>
            <FlaskConical className="h-3 w-3 mr-1" /> A/B
          </Button>
          <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-indigo-500 to-purple-600" onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            {generated ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-5 min-h-96">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="h-72 rounded bg-white/5 relative overflow-hidden">
                <div className="absolute inset-0 shimmer" />
                {kind === "image" && <ImageGenProgress active={loading} />}
              </div>
              <div className="h-3 bg-white/5 rounded w-2/3" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </motion.div>
          ) : generated ? (
            <motion.div key="output" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {children}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-80 text-center">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-600/30 flex items-center justify-center mb-3">
                <Wand2 className="h-6 w-6 text-indigo-200" />
              </div>
              <div className="text-sm font-medium">Ready to create</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-xs">Fill in the inputs on the left and hit Generate — your output appears here.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {moduleId && history.length > 0 && (
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Recent Generations</div>
          <div className="grid grid-cols-3 gap-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-white/10 bg-white/5 overflow-hidden hover:border-indigo-400/40 transition-colors">
                {h.output_image_url ? (
                  <img src={h.output_image_url} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="aspect-square p-2 text-[10px] text-foreground/70 overflow-hidden">
                    <div className="line-clamp-6 leading-snug">{h.output_content || h.prompt_used || "—"}</div>
                  </div>
                )}
                <div className="px-2 py-1 text-[9px] text-muted-foreground border-t border-white/10">
                  {new Date(h.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {critique && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-300 mb-2">
            <Sparkles className="h-4 w-4" /> AI Critique
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Hook Strength" value={`${critique.critique.hookStrength}/10`} good />
            <Stat label="Brand Voice" value={`${critique.critique.brandVoiceMatch}%`} good />
            <Stat label="Predicted CTR" value={`${critique.critique.predictedCtr}%`} sub={`Benchmark ${critique.critique.benchmark}%`} good />
            <Stat label="SEO Score" value={`${critique.critique.seoScore}/100`} good />
          </div>
          <div className="mt-3 text-xs text-foreground/70">
            <span className="text-indigo-300 font-medium">Tip · </span>{critique.critique.optimizationTip}
          </div>
        </motion.div>
      )}
    </div>
  );
}


function Stat({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm font-semibold", good ? "text-emerald-300" : "text-foreground")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ====== Brand DNA badge ======
export function BrandDnaBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-medium">
      <Check className="h-3 w-3" /> Brand DNA Active
    </span>
  );
}

// ====== Quota display ======
export function QuotaDisplay({ used = 13, total = 100 }: { used?: number; total?: number }) {
  const pct = (used / total) * 100;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{used} / {total} today</span>
      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={cn("h-full transition-all", pct > 90 ? "bg-rose-400" : "bg-indigo-400")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ====== Two-panel feature shell ======
export function FeatureShell({
  title, subtitle, left, right,
}: { title: string; subtitle?: string; left: ReactNode; right: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <BrandDnaBadge />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <div className="space-y-3">{left}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}