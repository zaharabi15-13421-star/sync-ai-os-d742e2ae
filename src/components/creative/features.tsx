import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Plus, X, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  FeatureShell, PromptInput, AspectRatioPicker, PlatformSelect, FileDrop,
  ColorCustomizer, SearchSelect, SeoKeywordPicker, AudienceAge, OutputPanel,
  Section, FieldLabel, type PromptAttachment,
} from "./shared";
import {
  BLOG_TOPICS, WRITING_STYLES, INDUSTRIES, LANGUAGES,
} from "@/lib/creative-mock";
import {
  generateCaption,
  generateHashtags,
  generateBlog,
  generateProductDescription,
  generateScript,
  generateImage,
  critiqueContent,
} from "@/lib/creative.functions";

function useGenerator() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [output, setOutput] = useState<any>(null);

  const run = async (kind: string, inputData?: any) => {
    setGenerated(false);
    setLoading(true);
    try {
      let result;
      switch (kind) {
        case "caption":
          result = await generateCaption({ data: inputData });
          setOutput({ caption: result.caption });
          break;
        case "hashtags":
          result = await generateHashtags({ data: inputData });
          setOutput({ hashtags: result.hashtags });
          break;
        case "blog":
          result = await generateBlog({ data: inputData });
          setOutput({ blogPost: result.blogPost, wordCount: result.wordCount });
          break;
        case "product-desc":
          result = await generateProductDescription({ data: inputData });
          setOutput({ description: result.description });
          break;
        case "script":
          result = await generateScript({ data: inputData });
          setOutput({ script: result.script });
          break;
        case "image-lab":
        case "thumbnail":
        case "poster":
        case "try-on":
        case "holography":
        case "product-photo":
          result = await generateImage({ data: { ...inputData, kind } });
          setOutput({ imageUrl: result.imageUrl });
          break;
        default:
          throw new Error(`Unknown generator type: ${kind}`);
      }
      setGenerated(true);
      toast.success("Generated with AI");
    } catch (error) {
      console.error("Generation failed:", error);
      const msg = error instanceof Error ? error.message : "Failed to generate. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { loading, generated, run, output };
}

// Reusable placeholder output canvases
function ImageOutput({ tint = "from-indigo-600 to-purple-700", label, imageUrl }: { tint?: string; label: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <div className="aspect-square rounded-lg overflow-hidden bg-black">
        <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`aspect-square rounded-lg bg-gradient-to-br ${tint} relative overflow-hidden`}>
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
        <Wand2 className="h-8 w-8 mb-2 opacity-80" />
        <div className="text-xs uppercase tracking-widest opacity-75">AI Generated</div>
        <div className="text-lg font-semibold mt-1">{label}</div>
      </div>
    </div>
  );
}

function TextOutput({ title, body }: { title: string; body: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <h3>{title}</h3>
      <p className="text-foreground/80 whitespace-pre-line">{body}</p>
    </div>
  );
}

// =================== 1.1 IMAGE LAB ===================
export function ImageLab() {
  const g = useGenerator();
  const [prompt, setPrompt] = useState("Hyper-real product flatlay, soft daylight, brand-aligned palette");
  const [tone, setTone] = useState("Premium");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [ratio, setRatio] = useState("1:1");
  const [style, setStyle] = useState("None");
  const [atts, setAtts] = useState<PromptAttachment[]>([]);
  const runGen = () => g.run("image-lab", { prompt, tone, style, aspectRatio: ratio, extras: { platforms }, attachments: atts });
  return (
    <FeatureShell title="Image Lab" subtitle="Generate high-fidelity on-brand imagery from a prompt"
      left={<>
        <Section title="Prompt">
          <PromptInput value={prompt} onChange={setPrompt} tone={tone} onToneChange={setTone}
            label="Describe the image you want to create"
            placeholder="e.g. A sleek smartphone on a marble surface, soft studio lighting, brand-aligned color palette"
            attachments={atts} onAttachmentsChange={setAtts} />
        </Section>
        <Section title="Targeting">
          <PlatformSelect value={platforms} onChange={setPlatforms} />
          <AspectRatioPicker value={ratio} onChange={setRatio} />
          <div>
            <FieldLabel>Enhancement Style</FieldLabel>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["None", "Editorial", "Cinematic", "Studio", "Lifestyle", "Bold Pop", "Soft Pastel", "Vintage Film"].map(s =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Section>
        <Button onClick={runGen} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          {g.loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Image
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={runGen} kind="image">
        <ImageOutput label="Image Lab" imageUrl={g.output?.imageUrl} />
      </OutputPanel>}
    />
  );
}

// =================== 1.2 POSTER STUDIO ===================
export function PosterStudio() {
  const g = useGenerator();
  const [logo, setLogo] = useState<File | File[] | null>(null);
  const [person, setPerson] = useState<File | File[] | null>(null);
  const [title, setTitle] = useState("Grand Opening");
  const [subtitle, setSubtitle] = useState("This Saturday at 6 PM");
  const [desc, setDesc] = useState("Launching our flagship store with live music and gifts.");
  const [cta, setCta] = useState("Book Your Spot");
  const [tone, setTone] = useState("Premium");
  const [date, setDate] = useState("");
  const [contact, setContact] = useState("www.brandsync.ai");
  const [theme, setTheme] = useState("Modern");
  const [colors, setColors] = useState<string[]>(["#4f46e5", "#7c3aed", "#0ea5e9", "#f8fafc"]);
  const [ratio, setRatio] = useState("4:5");
  const [atts, setAtts] = useState<PromptAttachment[]>([]);
  const runGen = () => g.run("poster", { prompt: desc, tone, style: theme, aspectRatio: ratio, extras: { title, subtitle, cta, date, contact, colors, hasPersonImage: !!person }, attachments: atts });
  return (
    <FeatureShell title="Intelligent Poster Studio" subtitle="Designed posters with smart layout, theme, and color control"
      left={<>
        <Section title="Brand">
          <FileDrop value={logo} onChange={setLogo} label="Upload your brand logo"
            dropHint="Drop your logo here or click to browse · JPG / PNG / SVG · Max 5MB"
            accept="image/jpeg,image/png,image/svg+xml" hint="JPG / PNG / SVG · 5MB" />
          <FileDrop value={person} onChange={setPerson} label="Upload a clear photo of a person or model"
            dropHint="Drop a high-resolution, front-facing photo here, or click to browse"
            accept="image/jpeg,image/png"
            hint="Use a high-resolution, front-facing photo for best results · JPG / PNG · Max 10MB" />
        </Section>
        <Section title="Content">
          <div><FieldLabel>Poster Headline</FieldLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10" /></div>
          <div><FieldLabel>Subtitle or Tagline</FieldLabel><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="bg-white/5 border-white/10" /></div>
          <PromptInput value={desc} onChange={setDesc} label="Event or Offer Description" tone={tone} onToneChange={setTone} rows={3}
            attachments={atts} onAttachmentsChange={setAtts} />
          <div><FieldLabel>CTA (Call to Action)</FieldLabel><Input value={cta} onChange={(e) => setCta(e.target.value)} className="bg-white/5 border-white/10" placeholder="e.g. Book Your Spot, Shop Now, RSVP" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><FieldLabel>Date</FieldLabel><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><FieldLabel>Contact / Website</FieldLabel><Input value={contact} onChange={(e) => setContact(e.target.value)} className="bg-white/5 border-white/10" /></div>
          </div>
        </Section>
        <Section title="Design">
          <div>
            <FieldLabel>Theme</FieldLabel>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Modern", "Minimal", "Corporate", "Festival", "Creative", "Tech", "Educational", "Elegant", "Luxury"].map(t =>
                  <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ColorCustomizer value={colors} onChange={setColors} />
          <AspectRatioPicker value={ratio} onChange={setRatio} />
        </Section>
        <Button onClick={runGen} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Poster
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={runGen} kind="image">
        {g.output?.imageUrl ? (
          <div className="rounded-lg overflow-hidden border border-white/10">
            <img src={g.output.imageUrl} alt={title} className="w-full h-auto" />
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-white/10" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}>
            <div className="aspect-[4/5] p-8 flex flex-col text-white">
              <div className="text-xs opacity-75 uppercase tracking-widest">{theme}</div>
              <div className="mt-auto">
                <div className="text-3xl font-bold">{title}</div>
                <div className="text-sm opacity-90 mt-1">{subtitle}</div>
                <div className="text-xs opacity-80 mt-4">{desc}</div>
                {cta && <div className="mt-4 inline-block self-start px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm">{cta}</div>}
                <div className="text-[10px] opacity-70 mt-6 flex justify-between">
                  <span>{date || "TBA"}</span><span>{contact}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </OutputPanel>}
    />
  );
}

// =================== 1.3 VIRTUAL TRY-ON ===================
export function VirtualTryOn() {
  const g = useGenerator();
  const [person, setPerson] = useState<File | File[] | null>(null);
  const [assets, setAssets] = useState<File | File[] | null>([]);
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [prompt, setPrompt] = useState("Outdoor catalog shot, natural daylight, magazine quality.");
  const [tone, setTone] = useState("Premium");
  const [ratio, setRatio] = useState("4:5");
  const [atts, setAtts] = useState<PromptAttachment[]>([]);
  const runGen = () => g.run("try-on", { prompt, tone, style: "Editorial", aspectRatio: ratio, extras: { platforms }, attachments: atts });
  return (
    <FeatureShell title="Virtual Try-On" subtitle="Fit garments and accessories on a model image"
      left={<>
        <Section title="Inputs">
          <FileDrop value={person} onChange={setPerson}
            label="Upload a clear full-body photo of a person"
            dropHint="Drop a high-resolution front-facing photo here, or click to browse"
            hint="Clear full-body photo" />
          <FileDrop value={assets} onChange={setAssets} multiple
            label="Upload clothing, shoes & accessories (up to 5 items)"
            hint="Clothing / shoes / accessories" />
        </Section>
        <Section title="Brief">
          <PromptInput value={prompt} onChange={setPrompt} tone={tone} onToneChange={setTone}
            attachments={atts} onAttachmentsChange={setAtts} />
          <PlatformSelect value={platforms} onChange={setPlatforms} />
          <AspectRatioPicker value={ratio} onChange={setRatio} />
        </Section>
        <Button onClick={runGen} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Self Model
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={runGen} kind="image">
        <ImageOutput tint="from-rose-500 to-fuchsia-700" label="Try-On Result" imageUrl={g.output?.imageUrl} />
      </OutputPanel>}
    />
  );
}

// =================== 1.4 PRODUCT HOLOGRAPHY ===================
export function ProductHolography() {
  const g = useGenerator();
  const [img, setImg] = useState<File | File[] | null>(null);
  const [prompt, setPrompt] = useState("Floating hologram with neon ring accents, dark glossy backdrop.");
  const [tone, setTone] = useState("Premium");
  const [labels, setLabels] = useState<{ text: string; position: string }[]>([
    { text: "AI-Powered", position: "Top" },
    { text: "60% Faster", position: "Bottom" },
  ]);
  const [atts, setAtts] = useState<PromptAttachment[]>([]);
  const runGen = () => g.run("holography", { prompt, tone, style: "Holographic", aspectRatio: "1:1", extras: { labels: labels.map(l => `${l.text} (${l.position})`) }, attachments: atts });
  return (
    <FeatureShell title="Product Holography" subtitle="Convert product photos into futuristic 3D-style holograms"
      left={<>
        <Section title="Product">
          <FileDrop value={img} onChange={setImg} label="Upload your product photo" dropHint="Drop a clean product photo here, or click to browse — white background recommended" />
          <PromptInput value={prompt} onChange={setPrompt} tone={tone} onToneChange={setTone}
            attachments={atts} onAttachmentsChange={setAtts} />
        </Section>
        <Section title="Product Labels" right={
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={labels.length >= 5}
            onClick={() => setLabels([...labels, { text: "", position: "Top" }])}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        }>
          <div className="space-y-2">
            {labels.map((l, i) => (
              <div key={i} className="flex gap-1.5">
                <Input value={l.text} placeholder="Label text"
                  onChange={(e) => setLabels(labels.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                  className="bg-white/5 border-white/10 h-9" />
                <Select value={l.position} onValueChange={(v) => setLabels(labels.map((x, j) => j === i ? { ...x, position: v } : x))}>
                  <SelectTrigger className="bg-white/5 border-white/10 w-28 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Top", "Bottom", "Left", "Right", "Center"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-9 w-9" disabled={labels.length <= 2}
                  onClick={() => setLabels(labels.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground">Min 2 · Max 5 labels</div>
          </div>
        </Section>
        <Button onClick={runGen} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Hologram
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={runGen} kind="image">
        <ImageOutput tint="from-cyan-500 via-indigo-600 to-purple-700" label="Hologram" imageUrl={g.output?.imageUrl} />
      </OutputPanel>}
    />
  );
}

// =================== 1.5 AI PRODUCT PHOTOGRAPHY ===================
export function ProductPhotography() {
  const g = useGenerator();
  const [img, setImg] = useState<File | File[] | null>(null);
  const [prompt, setPrompt] = useState("Premium studio shot, marble base, soft rim light, shallow depth of field.");
  const [tone, setTone] = useState("Luxury");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [ratio, setRatio] = useState("1:1");
  const [atts, setAtts] = useState<PromptAttachment[]>([]);
  const runGen = () => g.run("product-photo", { prompt, tone, style: "Studio", aspectRatio: ratio, extras: { platforms }, attachments: atts });
  return (
    <FeatureShell title="AI Product Photography" subtitle="Studio-grade product shots from a simple upload"
      left={<>
        <Section title="Product">
          <FileDrop value={img} onChange={setImg} label="Upload Your Product or Model Image" hint="Best with clean product shots" />
          <PromptInput value={prompt} onChange={setPrompt} tone={tone} onToneChange={setTone}
            attachments={atts} onAttachmentsChange={setAtts} />
        </Section>
        <Section title="Output">
          <PlatformSelect value={platforms} onChange={setPlatforms} />
          <AspectRatioPicker value={ratio} onChange={setRatio} />
        </Section>
        <Button onClick={runGen} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Studio Shots
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={runGen} kind="image">
        <ImageOutput tint="from-amber-500 via-rose-500 to-purple-700" label="Studio Shot" imageUrl={g.output?.imageUrl} />
      </OutputPanel>}
    />
  );
}

// =================== 2.1 BLOG PILOT ===================
export function BlogPilot() {
  const g = useGenerator();
  const [topics, setTopics] = useState<string[]>(["AI & Technology"]);
  const [words, setWords] = useState("Standard (1000-1500)");
  const [readTime, setReadTime] = useState("5 Min");
  const [headings, setHeadings] = useState("6");
  const [style, setStyle] = useState("Informative");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [lang, setLang] = useState("English");
  const [desc, setDesc] = useState("");
  const [topicQ, setTopicQ] = useState("");

  const wordToTime = (w: string) => {
    const m = w.match(/(\d+)-?(\d+)?/);
    if (!m) return readTime;
    const avg = m[2] ? (+m[1] + +m[2]) / 2 : +m[1];
    const min = Math.round(avg / 238);
    return min < 3 ? "2 Min" : min < 8 ? "5 Min" : min < 18 ? "10-15 Min" : min < 28 ? "20-30 Min" : "30-60 Min";
  };
  const timeToWord = (t: string) => {
    const map: Record<string, string> = {
      "2 Min": "Short (300-500)", "5 Min": "Medium (600-1000)", "10-15 Min": "Standard (1000-1500)",
      "20-30 Min": "Long-Form (1500-2500)", "30-60 Min": "SEO Article (2500-4000)", "90-120 Min": "Pillar (4000+)",
    };
    return map[t] || words;
  };

  const handleGenerate = () => {
    g.run("blog", {
      topics,
      wordCount: words,
      headings: +headings,
      style,
      keywords,
      language: lang,
      description: desc,
    });
  };

  return (
    <FeatureShell title="Blog Pilot" subtitle="3-phase blog generation — outline, write, review"
      left={<>
        <Section title="Topics">
          <Input value={topicQ} onChange={(e) => setTopicQ(e.target.value)} placeholder="Search topics..." className="bg-white/5 border-white/10 mb-2" />
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {BLOG_TOPICS.filter(t => t.toLowerCase().includes(topicQ.toLowerCase())).slice(0, 18).map((t) => (
              <button key={t} type="button" onClick={() => setTopics(topics.includes(t) ? topics.filter(x => x !== t) : [...topics, t])}
                className={`px-2 py-0.5 rounded-full text-[10px] border ${topics.includes(t) ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/40" : "bg-white/5 text-foreground/70 border-white/10"}`}>
                {t}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Length">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Word Count</FieldLabel>
              <Select value={words} onValueChange={(v) => { setWords(v); setReadTime(wordToTime(v)); }}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Short (300-500)", "Medium (600-1000)", "Standard (1000-1500)", "Long-Form (1500-2500)", "SEO Article (2500-4000)", "Pillar (4000+)", "5000+", "6000+", "7000+", "8000+", "9000+"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Reading Time</FieldLabel>
              <Select value={readTime} onValueChange={(v) => { setReadTime(v); setWords(timeToWord(v)); }}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2 Min", "5 Min", "10-15 Min", "20-30 Min", "30-60 Min", "90-120 Min"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>
        <Section title="Structure">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Headings</FieldLabel>
              <Select value={headings} onValueChange={setHeadings}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{["4","5","6","7","8","9","10"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Style</FieldLabel>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{WRITING_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <SeoKeywordPicker value={keywords} onChange={setKeywords} />
          <div>
            <FieldLabel>Language</FieldLabel>
            <SearchSelect value={lang} onChange={setLang} options={LANGUAGES} />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="bg-white/5 border-white/10" placeholder="AI will draft a description once fields are filled." />
          </div>
        </Section>
        <Button onClick={handleGenerate} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Blog
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={handleGenerate} contentForCritique={g.output?.blogPost || ""} kind="content">
        <TextOutput title={topics[0] || "AI-Powered Marketing Blog"}
          body={g.output?.blogPost || "Your AI-generated blog post will appear here..."} />
      </OutputPanel>}
    />
  );
}

// =================== 2.2 CAPTION CRAFT ===================
export function CaptionCraft() {
  const g = useGenerator();
  const [desc, setDesc] = useState("Predictive marketing OS for modern teams.");
  const [tone, setTone] = useState("Promotional");
  const [audience, setAudience] = useState<string[]>(["Founders"]);
  const [age, setAge] = useState("25-35");
  const [gender, setGender] = useState("All");
  const [platform, setPlatform] = useState("Instagram");
  const [lang, setLang] = useState("English");

  const handleGenerate = () => {
    g.run("caption", {
      description: desc,
      platform,
      tone,
      audience,
      language: lang,
    });
  };

  return (
    <FeatureShell title="Caption Craft" subtitle="Platform-tuned captions in any language"
      left={<>
        <Section title="What you're promoting">
          <PromptInput value={desc} onChange={setDesc} tone={tone} onToneChange={setTone} label="Description" />
        </Section>
        <Section title="Audience">
          <div>
            <FieldLabel>Audience Type</FieldLabel>
            <Input value={audience.join(", ")} onChange={(e) => setAudience(e.target.value.split(",").map(x => x.trim()))} className="bg-white/5 border-white/10" placeholder="Founders, Marketers..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <AudienceAge value={age} onChange={setAge} />
            <div>
              <FieldLabel>Gender</FieldLabel>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{["Male", "Female", "Transgender", "Male & Female Both", "All"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Section>
        <Section title="Output">
          <div>
            <FieldLabel>Platform</FieldLabel>
            <SearchSelect value={platform} onChange={setPlatform} options={["Instagram","Facebook","LinkedIn","Twitter/X","TikTok","YouTube","Pinterest","Snapchat","Threads"]} />
          </div>
          <div>
            <FieldLabel>Language</FieldLabel>
            <SearchSelect value={lang} onChange={setLang} options={LANGUAGES} />
          </div>
        </Section>
        <Button onClick={handleGenerate} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Caption
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={handleGenerate} contentForCritique={g.output?.caption || ""} kind="content">
        <TextOutput title="Generated Caption"
          body={g.output?.caption || "Your AI-generated caption will appear here..."} />
      </OutputPanel>}
    />
  );
}

// =================== 2.3 HASHTAG WIZARD ===================
export function HashtagWizard() {
  const g = useGenerator();
  const [industry, setIndustry] = useState("Digital Marketing");
  const [platform, setPlatform] = useState("Instagram");
  const [count, setCount] = useState("15");

  const handleGenerate = () => {
    g.run("hashtags", {
      industry,
      platform,
      count: +count,
    });
  };

  const hashtags = g.output?.hashtags;
  const allHashtags = [
    ...(hashtags?.trending || []).map((t: string) => ({ tag: t, group: "Trending" })),
    ...(hashtags?.niche || []).map((t: string) => ({ tag: t, group: "Niche" })),
    ...(hashtags?.broad || []).map((t: string) => ({ tag: t, group: "Broad" })),
  ];

  const trending = hashtags?.trending || [];
  const niche = hashtags?.niche || [];
  const broad = hashtags?.broad || [];

  return (
    <FeatureShell title="Hashtag & Keywords Wizard" subtitle="Smart, segmented hashtags for maximum reach"
      left={<>
        <Section title="Niche">
          <div>
            <FieldLabel>Industry / Niche</FieldLabel>
            <SearchSelect value={industry} onChange={setIndustry} options={INDUSTRIES} />
          </div>
          <div>
            <FieldLabel>Platform</FieldLabel>
            <SearchSelect value={platform} onChange={setPlatform} options={["Facebook","Instagram","LinkedIn","TikTok","YouTube","X (Twitter)","Pinterest","Snapchat","Threads"]} />
          </div>
          <div>
            <FieldLabel>Number of Hashtags</FieldLabel>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>{["10","15","20","25","30"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Section>
        <Button onClick={handleGenerate} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Hashtags
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={handleGenerate} kind="content">
        <div className="space-y-4">
          {g.generated ? (
            <>
              {trending.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Trending</div>
                  <div className="flex flex-wrap gap-1.5">
                    {trending.map((t: string) => (
                      <button key={t} onClick={() => { navigator.clipboard.writeText(t); toast.success("Copied"); }}
                        title="Click to copy"
                        className="px-2.5 py-1 rounded-full text-xs border bg-rose-500/15 text-rose-300 border-rose-400/30 hover:scale-105 transition-transform">
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {niche.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Niche</div>
                  <div className="flex flex-wrap gap-1.5">
                    {niche.map((t: string) => (
                      <button key={t} onClick={() => { navigator.clipboard.writeText(t); toast.success("Copied"); }}
                        title="Click to copy"
                        className="px-2.5 py-1 rounded-full text-xs border bg-indigo-500/15 text-indigo-300 border-indigo-400/30 hover:scale-105 transition-transform">
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {broad.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Broad</div>
                  <div className="flex flex-wrap gap-1.5">
                    {broad.map((t: string) => (
                      <button key={t} onClick={() => { navigator.clipboard.writeText(t); toast.success("Copied"); }}
                        title="Click to copy"
                        className="px-2.5 py-1 rounded-full text-xs border bg-emerald-500/15 text-emerald-300 border-emerald-400/30 hover:scale-105 transition-transform">
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(allHashtags.map((h: any) => `#${h.tag}`).join(" ")); toast.success("All copied"); }}><Copy className="h-3 w-3 mr-1" /> Copy All</Button>
                <Button size="sm" variant="ghost" onClick={() => toast.success("Exported CSV")}>Export CSV</Button>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              Your AI-generated hashtags will appear here...
            </div>
          )}
        </div>
      </OutputPanel>}
    />
  );
}

// =================== 2.4 PRODUCT DESCRIPTION ===================
export function ProductDescription() {
  const g = useGenerator();
  const [name, setName] = useState("BrandSync OS");
  const [desc, setDesc] = useState("AI-native marketing operating system.");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("Medium (600-1000)");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [style, setStyle] = useState("Persuasive");
  const [lang, setLang] = useState("English");

  const handleGenerate = () => {
    g.run("product-desc", {
      productName: name,
      description: desc,
      tone,
      length,
      keywords,
      style,
      language: lang,
    });
  };

  return (
    <FeatureShell title="Product Description Optimizer" subtitle="SEO-tuned product copy that converts"
      left={<>
        <Section title="Product">
          <div><FieldLabel>Product Name</FieldLabel><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" /></div>
          <PromptInput value={desc} onChange={setDesc} tone={tone} onToneChange={setTone} label="Brief product description or key selling points" placeholder="e.g. AI-powered marketing OS that replaces HubSpot, Hootsuite, Canva, and 10+ other tools in one unified platform" rows={3} />
        </Section>
        <Section title="Output">
          <div>
            <FieldLabel>Length</FieldLabel>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>{["Short (300-500)", "Medium (600-1000)", "Standard (1000-1500)", "Long-Form (1500-2500)"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <SeoKeywordPicker value={keywords} onChange={setKeywords} />
          <div>
            <FieldLabel>Style</FieldLabel>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>{WRITING_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Language</FieldLabel>
            <SearchSelect value={lang} onChange={setLang} options={LANGUAGES} />
          </div>
        </Section>
        <Button onClick={handleGenerate} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Description
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={handleGenerate} contentForCritique={g.output?.description || ""} kind="content">
        <TextOutput title={name}
          body={g.output?.description || "Your AI-generated product description will appear here..."} />
      </OutputPanel>}
    />
  );
}

// =================== 3.1 THUMBNAIL GENERATOR ===================
export function ThumbnailGenerator() {
  const g = useGenerator();
  const [img, setImg] = useState<File | File[] | null>(null);
  const [headline, setHeadline] = useState("AI Will Change Everything");
  const [sub, setSub] = useState("Here's what's coming in 2026");
  const [style, setStyle] = useState("Bold");
  const [color, setColor] = useState("#ef4444");
  const [ratio, setRatio] = useState("16:9");
  return (
    <FeatureShell title="Thumbnail Generator" subtitle="High-CTR YouTube thumbnails with overlay text"
      left={<>
        <Section title="Image">
          <FileDrop value={img} onChange={setImg} label="Upload a background or reference image" dropHint="Drop your image here or click to browse · JPG / PNG" accept="image/jpeg,image/png,image/webp" />
        </Section>
        <Section title="Thumbnail Settings">
          <div>
            <FieldLabel hint="AI will suggest from image">Thumbnail Headline</FieldLabel>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <FieldLabel hint="Auto-suggested">Thumbnail Subheading</FieldLabel>
            <Input value={sub} onChange={(e) => setSub(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <FieldLabel>Thumbnail Style</FieldLabel>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { v: "Professional", d: "Clean and business-focused" },
                  { v: "Bold", d: "Eye-catching and attention-grabbing" },
                  { v: "Fun", d: "Playful and engaging" },
                  { v: "Minimal", d: "Simple and elegant" },
                ].map(s => (
                  <SelectItem key={s.v} value={s.v}>
                    <div className="flex flex-col">
                      <span>{s.v}</span>
                      <span className="text-[10px] text-muted-foreground">{s.d}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Brand Color</FieldLabel>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border border-white/10 bg-transparent cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="bg-white/5 border-white/10 font-mono" />
            </div>
          </div>
          <div>
            <FieldLabel>Aspect Ratio</FieldLabel>
            <Select value={ratio} onValueChange={setRatio}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>{["16:9","1280×720","21:9","4:3","1:1","2:1","3:2","9:16","32:9"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Section>
        <Button onClick={() => g.run("thumbnail", { prompt: `${headline} — ${sub}`, tone: "Bold", style, aspectRatio: ratio, extras: { headline, subheading: sub, brandColor: color } })} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Thumbnail
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={() => g.run("thumbnail", { prompt: `${headline} — ${sub}`, tone: "Bold", style, aspectRatio: ratio, extras: { headline, subheading: sub, brandColor: color } })} kind="image">
        {g.output?.imageUrl ? (
          <div className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
            <img src={g.output.imageUrl} alt={headline} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-lg overflow-hidden relative bg-gradient-to-br from-slate-900 via-indigo-950 to-black border border-white/10">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="absolute top-4 left-4 right-4">
              <div className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white rounded" style={{ background: color }}>{style}</div>
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-4xl font-black text-white drop-shadow-lg leading-tight" style={{ textShadow: `4px 4px 0 ${color}` }}>{headline}</div>
              <div className="text-sm text-white/90 mt-2">{sub}</div>
            </div>
          </div>
        )}
      </OutputPanel>}
    />
  );
}

// =================== 3.2 SCRIPT WRITER ===================
export function ScriptWriter() {
  const g = useGenerator();
  const [topic, setTopic] = useState("How AI is reshaping modern marketing teams");
  const [tone, setTone] = useState("Energetic");
  const [duration, setDuration] = useState([5]);
  const [audience, setAudience] = useState<string[]>(["Marketers"]);
  const [age, setAge] = useState("25-35");
  const [gender, setGender] = useState("All");
  const [lang, setLang] = useState("English");
  const [goal, setGoal] = useState<string>("");
  const [customGoals, setCustomGoals] = useState<string[]>([]);
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const wordCount = Math.round(duration[0] * 150);

  const DEFAULT_GOALS = [
    "Educational", "Entertainment", "Promotional", "Tutorial",
    "Brand Awareness", "Lead Generation", "Product Launch", "Customer Testimonial",
    "Social Media Engagement", "Storytelling", "Event Promotion", "Training & Development",
  ];
  const allGoals = [...DEFAULT_GOALS, ...customGoals];

  const handleGenerate = () => {
    g.run("script", {
      topic,
      duration: duration[0],
      audience,
      tone,
      language: lang,
      ...(goal ? { videoGoal: goal } : {}),
    });
  };

  const script = g.output?.script;

  return (
    <FeatureShell title="Smart Script Writer" subtitle="Structured YouTube scripts — Hook, Intro, Body, CTA, Outro"
      left={<>
        <Section title="Concept">
          <PromptInput value={topic} onChange={setTopic} tone={tone} onToneChange={setTone}
            label="What is your video about?"
            placeholder="e.g. How BrandSync AI replaces 10 marketing tools with one platform" />
          <div>
            <FieldLabel>Video Goal</FieldLabel>
            <Select value={goal} onValueChange={(v) => { if (v !== "__add__") setGoal(v); }}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select the primary goal of this video" />
              </SelectTrigger>
              <SelectContent>
                {allGoals.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                <div className="border-t border-white/10 mt-1 pt-1">
                  {addingGoal ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <Input
                        autoFocus
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="Custom goal name"
                        className="h-7 bg-white/5 border-white/10 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newGoal.trim()) {
                            const v = newGoal.trim();
                            setCustomGoals([...customGoals, v]);
                            setGoal(v);
                            setNewGoal("");
                            setAddingGoal(false);
                          } else if (e.key === "Escape") {
                            setAddingGoal(false);
                            setNewGoal("");
                          }
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        if (newGoal.trim()) {
                          const v = newGoal.trim();
                          setCustomGoals([...customGoals, v]);
                          setGoal(v);
                        }
                        setNewGoal("");
                        setAddingGoal(false);
                      }}>✓</Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingGoal(false); setNewGoal(""); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAddingGoal(true); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-300 hover:bg-white/5 rounded"
                    >
                      <Plus className="h-3 w-3" /> Add custom goal
                    </button>
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>
        </Section>
        <Section title="Video Length">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>{duration[0]} min</span>
            <span className="text-muted-foreground">~{wordCount.toLocaleString()} words</span>
          </div>
          <Slider value={duration} onValueChange={setDuration} min={1} max={10} step={1} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            {[1,2,3,5,7,10].map(t => <span key={t}>{t}m</span>)}
          </div>
        </Section>
        <Section title="Audience">
          <div>
            <FieldLabel>Who is your target audience?</FieldLabel>
            <Input value={audience.join(", ")} onChange={(e) => setAudience(e.target.value.split(",").map(x => x.trim()))} className="bg-white/5 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <AudienceAge value={age} onChange={setAge} />
            <div>
              <FieldLabel>Gender</FieldLabel>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>{["Male", "Female", "Transgender", "Male & Female Both", "All"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel>Language</FieldLabel>
            <SearchSelect value={lang} onChange={setLang} options={LANGUAGES} />
          </div>
        </Section>
        <Button onClick={handleGenerate} disabled={g.loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Script
        </Button>
      </>}
      right={<OutputPanel loading={g.loading} generated={g.generated} onGenerate={handleGenerate} kind="content">
        <div className="space-y-4">
          {g.generated && script ? (
            <>
              {script.hook && (
                <div className="border-l-2 border-indigo-400/40 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">HOOK</Badge>
                    <span className="text-[10px] text-muted-foreground">0:00 – 0:15</span>
                  </div>
                  <p className="text-sm text-foreground/85 mt-1">{script.hook}</p>
                </div>
              )}
              {script.intro && (
                <div className="border-l-2 border-indigo-400/40 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">INTRO</Badge>
                    <span className="text-[10px] text-muted-foreground">0:15 – 0:45</span>
                  </div>
                  <p className="text-sm text-foreground/85 mt-1">{script.intro}</p>
                </div>
              )}
              {script.body && (
                <div className="border-l-2 border-indigo-400/40 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">BODY</Badge>
                    <span className="text-[10px] text-muted-foreground">0:45 – End</span>
                  </div>
                  <p className="text-sm text-foreground/85 mt-1 whitespace-pre-line">{script.body}</p>
                </div>
              )}
              {script.cta && (
                <div className="border-l-2 border-indigo-400/40 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">CTA</Badge>
                    <span className="text-[10px] text-muted-foreground">End-1:00</span>
                  </div>
                  <p className="text-sm text-foreground/85 mt-1">{script.cta}</p>
                </div>
              )}
              {script.outro && (
                <div className="border-l-2 border-indigo-400/40 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">OUTRO</Badge>
                    <span className="text-[10px] text-muted-foreground">End</span>
                  </div>
                  <p className="text-sm text-foreground/85 mt-1">{script.outro}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              Your AI-generated script will appear here...
            </div>
          )}
        </div>
      </OutputPanel>}
    />
  );
}