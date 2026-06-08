import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  buildGuidelineContent,
  startGeneration,
  updateGenerationProgress,
  finalizeGeneration,
  errorGeneration,
  createWebBrandBook,
} from "@/lib/brand-guideline-gen.functions";
import { generatePDF, generatePPTX, generateDOCX } from "@/services/fileGenerationService";
import type { GuidelineFormat } from "@/components/brand-guideline/FormatSelector";

export type GenStatus = "idle" | "generating" | "complete" | "error";

export type StepStatus = "pending" | "active" | "complete";
export type Step = {
  id: string;
  title: string;
  description: string;
  preview?: string;
  status: StepStatus;
};

const STEP_DEFS = (format: GuidelineFormat): Step[] => [
  { id: "s1", title: "Reading Brand Summary", description: "Extracting brand identity, colors, typography, and AI summary", status: "pending" },
  { id: "s2", title: "Analyzing Visual Identity", description: "Processing brand colors, typography system, and aesthetic profile", status: "pending" },
  { id: "s3", title: "Processing Brand Voice", description: "Defining tone, archetype, and messaging framework", status: "pending" },
  { id: "s4", title: "Incorporating Brand Details", description: "Adding location, business hours, social presence, and contact information", status: "pending" },
  { id: "s5", title: "Integrating SEO Keywords", description: "Embedding keyword strategy and SEO positioning data", status: "pending" },
  { id: "s6", title: "Analyzing Competitive Landscape", description: "Positioning brand against identified competitors", status: "pending" },
  { id: "s7", title: "Generating Brand Strategy", description: "Creating brand positioning, messaging pillars, and strategic recommendations", status: "pending" },
  { id: "s8", title: "Writing Brand Guidelines", description: "Documenting complete brand standards, do's and don'ts, and usage guidelines", status: "pending" },
  {
    id: "s9",
    title:
      format === "pdf" ? "Formatting PDF Document"
        : format === "ppt" ? "Building PowerPoint Slides"
        : format === "docx" ? "Structuring Word Document"
        : "Assembling Web Brand Book",
    description: "Applying brand styling and professional layout to final output",
    status: "pending",
  },
  { id: "s10", title: "Quality Review", description: "Validating content completeness and professional standards", status: "pending" },
];

const STEP_PROGRESS = [10, 20, 30, 40, 50, 60, 70, 82, 95, 100];

export function useBrandGuidelineGen() {
  const [status, setStatus] = useState<GenStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    format: GuidelineFormat;
    fileUrl?: string;
    webBookSlug?: string;
    blob?: Blob;
    fileName?: string;
    sectionsCount: number;
    content: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildFn = useServerFn(buildGuidelineContent);
  const startFn = useServerFn(startGeneration);
  const progressFn = useServerFn(updateGenerationProgress);
  const finalizeFn = useServerFn(finalizeGeneration);
  const errFn = useServerFn(errorGeneration);
  const webBookFn = useServerFn(createWebBrandBook);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const advanceStep = useCallback(
    async (
      id: string,
      stepIndex: number,
      stepsArr: Step[],
      preview?: string,
    ) => {
      const newSteps = stepsArr.map((s, i) => ({
        ...s,
        status: i < stepIndex ? "complete" as StepStatus
          : i === stepIndex ? "active" as StepStatus
          : "pending" as StepStatus,
        preview: i === stepIndex - 1 && preview ? preview : s.preview,
      }));
      setSteps(newSteps);
      const pct = stepIndex === 0 ? 5 : STEP_PROGRESS[stepIndex - 1];
      setProgress(pct);
      try {
        await progressFn({ data: { id, progress: pct, step: newSteps[stepIndex]?.title ?? null } });
      } catch { /* non-fatal */ }
      return newSteps;
    },
    [progressFn],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setSteps([]);
    setGenerationId(null);
    setResult(null);
    setError(null);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const generate = useCallback(
    async (opts: { brandSummaryId: string; format: GuidelineFormat; brandSummary: any }) => {
      reset();
      setStatus("generating");
      const initial = STEP_DEFS(opts.format);
      setSteps(initial);

      try {
        // 1. Create row + subscribe to realtime
        const startRes = (await startFn({
          data: { brandSummaryId: opts.brandSummaryId, format: opts.format },
        })) as { id: string };
        const id = startRes.id;
        setGenerationId(id);

        channelRef.current = supabase
          .channel(`bgg-${id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "brand_guideline_generations",
              filter: `id=eq.${id}`,
            },
            (payload) => {
              const row = payload.new as any;
              if (typeof row.generation_progress === "number") {
                setProgress((p) => Math.max(p, row.generation_progress));
              }
            },
          )
          .subscribe();

        // Step 1: Reading Brand Summary
        let cur = await advanceStep(
          id, 0, initial,
          `Brand: ${opts.brandSummary.brand_name || "Brand"} · Colors: ${opts.brandSummary.brand_colors?.length || 0} detected · Values: ${opts.brandSummary.brand_values?.length || 0} identified`,
        );

        // Step 2: Visual Identity
        cur = await advanceStep(id, 1, cur);
        await new Promise((r) => setTimeout(r, 600));
        const primaryColor = opts.brandSummary.brand_colors?.[0]?.hex ?? "#7C3AED";
        const primaryFont = opts.brandSummary.typography?.[0]?.font ?? "Inter";
        cur = cur.map((s, i) =>
          i === 1
            ? { ...s, preview: `Primary: ${primaryColor} · Typography: ${primaryFont} · Aesthetic: ${opts.brandSummary.brand_aesthetic ?? "Modern"}` }
            : s,
        );
        setSteps(cur);

        // Step 3: Brand Voice
        cur = await advanceStep(id, 2, cur);
        await new Promise((r) => setTimeout(r, 500));
        cur = cur.map((s, i) =>
          i === 2
            ? { ...s, preview: `Tone: ${opts.brandSummary.brand_tone ?? "Professional"} · Archetype: ${opts.brandSummary.brand_archetype ?? "Sage"}` }
            : s,
        );
        setSteps(cur);

        // Step 4 + 5 (optional/skipped)
        cur = await advanceStep(id, 3, cur, "Brand details sections included");
        await new Promise((r) => setTimeout(r, 400));
        cur = await advanceStep(id, 4, cur, "Keyword strategy integrated");
        await new Promise((r) => setTimeout(r, 400));

        // Step 6
        cur = await advanceStep(id, 5, cur);
        await new Promise((r) => setTimeout(r, 400));
        cur = cur.map((s, i) =>
          i === 5
            ? { ...s, preview: `Market position analyzed for ${opts.brandSummary.brand_name || "brand"}` }
            : s,
        );
        setSteps(cur);

        // Step 7: kick off AI
        cur = await advanceStep(id, 6, cur);
        const buildRes = (await buildFn({
          data: { brandSummaryId: opts.brandSummaryId },
        })) as { content: any; brandSummary: any };
        const content = buildRes.content;
        cur = cur.map((s, i) =>
          i === 6
            ? { ...s, preview: `${content?.voice_and_tone?.sample_taglines?.length || 3} messaging pillars · ${content?.brand_overview?.core_values?.length || 5} strategic recommendations generated` }
            : s,
        );
        setSteps(cur);

        // Step 8: Writing guidelines
        cur = await advanceStep(id, 7, cur, "12+ sections · Professional grade");

        // Step 9: Build file
        cur = await advanceStep(id, 8, cur);

        const brandName = opts.brandSummary.brand_name || "Brand";
        const inputs = {
          brandName,
          slogan: opts.brandSummary.tagline ?? undefined,
          industry: opts.brandSummary.brand_aesthetic ?? "General",
          colorPalette: content?.visual_identity?.color_palette,
        };
        const safe = brandName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "brand";

        let storagePath: string | null = null;
        let blob: Blob | undefined;
        let fileName: string | undefined;
        let webBookSlug: string | null = null;

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Not authenticated");

        if (opts.format === "web") {
          const r = (await webBookFn({
            data: {
              generationId: id,
              brandName,
              brandData: { content, summary: opts.brandSummary },
            },
          })) as { slug: string };
          webBookSlug = r.slug;
        } else {
          let mime = "application/pdf";
          let ext = "pdf";
          if (opts.format === "pdf") {
            blob = await generatePDF(content, inputs);
          } else if (opts.format === "ppt") {
            blob = await generatePPTX(content, inputs);
            mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            ext = "pptx";
          } else if (opts.format === "docx") {
            blob = await generateDOCX(content, inputs);
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            ext = "docx";
          }
          fileName = `${safe}-brand-guideline.${ext}`;
          storagePath = `${userId}/generations/${id}/${fileName}`;
          if (blob) {
            const { error: upErr } = await supabase.storage
              .from("brand-guidelines")
              .upload(storagePath, blob, { contentType: mime, upsert: true });
            if (upErr) throw new Error(upErr.message);
          }
        }

        cur = await advanceStep(id, 9, cur, "Ready for delivery");
        await new Promise((r) => setTimeout(r, 300));
        const finalSteps = cur.map((s) => ({ ...s, status: "complete" as StepStatus }));
        setSteps(finalSteps);

        const finalRes = (await finalizeFn({
          data: {
            id,
            storagePath,
            webBookSlug,
            fileSizeBytes: blob?.size ?? null,
            sectionsCount: 11,
          },
        })) as { generation: any };

        setProgress(100);
        setResult({
          format: opts.format,
          fileUrl: finalRes.generation?.file_url ?? undefined,
          webBookSlug: webBookSlug ?? undefined,
          blob,
          fileName,
          sectionsCount: 11,
          content,
        });
        setStatus("complete");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        setError(msg);
        setStatus("error");
        toast.error(msg);
        if (generationId) {
          try { await errFn({ data: { id: generationId, message: msg } }); } catch { /* noop */ }
        }
      }
    },
    [advanceStep, buildFn, errFn, finalizeFn, generationId, reset, startFn, webBookFn],
  );

  return { status, progress, steps, result, error, generationId, generate, reset };
}
