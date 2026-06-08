// Creative Engine Server Functions — Real AI Generation
// Using Google Gemini API directly for text and image generation

import { createServerFn } from "@tanstack/react-start";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { lovableModel } from "@/lib/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Use higher-tier Gemini Pro for the strongest text/structured outputs.
const googleModel = () => lovableModel("google/gemini-2.5-pro");

// =================== TEXT GENERATION FUNCTIONS ===================

/**
 * Generate social media caption with emojis and hashtags
 */
export const generateCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      description: z.string().min(1, "Description is required"),
      platform: z.string().default("Instagram"),
      tone: z.string().default("Promotional"),
      audience: z.array(z.string()).default([]),
      language: z.string().default("English"),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { description, platform, tone, audience, language } = data;

    const result = await generateText({
      model: googleModel(),
      prompt: `Generate a ${tone} social media caption for ${platform} in ${language}.

Description: ${description}
Target Audience: ${audience.join(", ") || "General"}
Platform: ${platform}
Tone: ${tone}

Requirements:
- Include relevant emojis
- Add 5-10 relevant hashtags at the end
- Keep it under 220 characters for the main caption
- Make it engaging and platform-appropriate
- For LinkedIn: more professional tone
- For Instagram/TikTok: casual and fun
- For Twitter/X: concise and punchy

Return ONLY the caption text - no explanation, no JSON.`,
    });

    return {
      caption: result.text,
    };
  });

/**
 * Generate hashtags segmented by category
 */
export const generateHashtags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      industry: z.string().min(1, "Industry is required"),
      platform: z.string().default("Instagram"),
      count: z.coerce.number().min(5).max(30).default(15),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { industry, platform, count } = data;

    const result = await generateObject({
      model: googleModel(),
      schema: z.object({
        trending: z.array(z.string()).min(2),
        niche: z.array(z.string()).min(2),
        broad: z.array(z.string()).min(2),
      }),
      prompt: `Generate ${count} hashtags for ${industry} on ${platform}.

Segment them into:
1. Trending (hot right now, high volume) - 2-3 tags
2. Niche (specific to the industry) - 4-5 tags
3. Broad (general marketing/industry tags) - 3-4 tags

Return exactly ${count} total hashtags distributed across categories. Return ONLY JSON.`,
    });

    return {
      hashtags: result.object,
    };
  });

/**
 * Generate full blog post with markdown
 */
export const generateBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      topics: z.array(z.string()).min(1),
      wordCount: z.string().default("Standard (1000-1500)"),
      headings: z.coerce.number().min(4).max(10).default(6),
      style: z.string().default("Informative"),
      keywords: z.array(z.string()).default([]),
      language: z.string().default("English"),
      description: z.string().optional(),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { topics, wordCount, headings, style, keywords, language, description } = data;

    // Extract target word count from string like "Standard (1000-1500)"
    const wordCountMatch = wordCount.match(/\d+-?(\d+)?/);
    const targetWords = wordCountMatch ? (wordCountMatch[2] ? ((+wordCountMatch[1] + +wordCountMatch[2]) / 2) : +wordCountMatch[1]) : 1200;

    const result = await generateText({
      model: googleModel(),
      prompt: `Write a ${style} blog post in ${language} approximately ${targetWords} words.

Topic(s): ${topics.join(", ")}
${description ? `Additional Context: ${description}` : ""}
Style: ${style}
Number of headings: ${headings}
${keywords.length > 0 ? `Keywords to include: ${keywords.join(", ")}` : ""}

Structure:
- Catchy title
- Brief introduction
- ${headings} main sections with clear headings
- Conclusion with call-to-action

Format as markdown with proper heading levels (# ## ###), bullet points, and emphasis.

Return ONLY the blog post markdown - no explanation.`,
    });

    return {
      blogPost: result.text,
      wordCount: result.text.split(/\s+/).length,
    };
  });

/**
 * Generate product description
 */
export const generateProductDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      productName: z.string().min(1, "Product name is required"),
      description: z.string().min(1, "Description is required"),
      tone: z.string().default("Professional"),
      length: z.string().default("Medium (600-1000)"),
      keywords: z.array(z.string()).default([]),
      style: z.string().default("Persuasive"),
      language: z.string().default("English"),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { productName, description, tone, length, keywords, style, language } = data;

    const result = await generateText({
      model: googleModel(),
      prompt: `Write a ${style} product description in ${language} for:

Product: ${productName}
Base Description: ${description}
Tone: ${tone}
Length: ${length}
${keywords.length > 0 ? `Keywords: ${keywords.join(", ")}` : ""}

Create a compelling, SEO-optimized description that:
1. Opens with a strong hook
2. Lists 3-5 key benefits
3. Addresses customer pain points
4. Includes a call-to-action
5. Uses bullet points for readability
6. Sounds ${tone} and ${style}

Return ONLY the description - no explanation.`,
    });

    return {
      description: result.text,
    };
  });

/**
 * Generate YouTube script with sections
 */
export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      topic: z.string().min(1, "Topic is required"),
      duration: z.coerce.number().min(1).max(10).default(5),
      audience: z.array(z.string()).default([]),
      tone: z.string().default("Energetic"),
      language: z.string().default("English"),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { topic, duration, audience, tone, language } = data;

    const result = await generateObject({
      model: googleModel(),
      schema: z.object({
        hook: z.string().describe("15-second attention grabber"),
        intro: z.string().describe("30-second introduction"),
        body: z.string().describe("Main content - bullet points or sections"),
        cta: z.string().describe("Call-to-action"),
        outro: z.string().describe("Closing remarks"),
      }),
      prompt: `Create a YouTube script in ${language} for a ${duration}-minute video.

Topic: ${topic}
Target Audience: ${audience.join(", ") || "General"}
Tone: ${tone}

Structure the script with:
1. HOOK (0:00-0:15): Attention-grabbing opening
2. INTRO (0:15-0:45): Who you are and what this video covers
3. BODY (0:45-End-1:00): Main content with key points
4. CTA (End-1:00-End-0:30): Call to action
5. OUTRO (End-0:30-End): Sign off

Make it engaging and ${tone}.

Return ONLY valid JSON - no markdown, no explanation.`,
    });

    return {
      script: result.object,
    };
  });

// =================== IMAGE GENERATION FUNCTIONS ===================

/**
 * Generate marketing image via Lovable AI Gateway (returns base64 data URL).
 * Used by Image Lab, Poster, Try-On, Holography, Product Photography, Thumbnail.
 */
export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      prompt: z.string().min(1, "Prompt is required"),
      tone: z.string().default("Premium"),
      style: z.string().default("Editorial"),
      aspectRatio: z.string().default("1:1"),
      kind: z.string().default("image"),
      extras: z.record(z.string(), z.any()).optional(),
      attachments: z.array(z.object({
        dataUrl: z.string(),
        mimeType: z.string(),
        name: z.string().optional(),
      })).optional(),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { prompt, tone, style, aspectRatio, kind, extras, attachments } = data;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const extrasText = extras
      ? Object.entries(extras)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n")
      : "";

    const kindHints: Record<string, string> = {
      "image-lab": "High-fidelity on-brand marketing image.",
      "poster": "Designed marketing poster with bold typography, balanced composition, and clear visual hierarchy. Render the title, subtitle, CTA, date, and contact text legibly within the poster.",
      "try-on": "Realistic catalog-grade fashion photo of a model wearing the described garments. Magazine quality, natural lighting.",
      "holography": "Futuristic 3D-style product hologram with neon ring accents on a dark glossy backdrop, with the requested floating labels.",
      "product-photo": "Studio-grade product photography, premium lighting, clean composition, shallow depth of field.",
      "thumbnail": "High-CTR YouTube thumbnail with overlay headline and subheading, bold readable typography, attention-grabbing colors.",
    };

    const fullPrompt = `${kindHints[kind] || ""}

Subject: ${prompt}
Style: ${style}
Tone: ${tone}
Aspect Ratio: ${aspectRatio}
${extrasText ? `\nAdditional brief:\n${extrasText}` : ""}
${attachments && attachments.length > 0 ? `\nUse the attached reference image(s) as the visual foundation — preserve the product/model identity, palette, and key details, then apply the requested style.` : ""}

Make it visually striking, on-brand, and production-ready.`;

    // Build multimodal content with any attached reference images.
    const imageAttachments = (attachments || []).filter(a => a.mimeType?.startsWith("image/"));
    const userContent: any = imageAttachments.length > 0
      ? [
          { type: "text", text: fullPrompt },
          ...imageAttachments.map(a => ({
            type: "image_url",
            image_url: { url: a.dataUrl },
          })),
        ]
      : fullPrompt;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`Image generation failed (${resp.status}): ${text.slice(0, 200)}`);
    }

    const json: any = await resp.json();
    const item = json?.data?.[0];
    let imageUrl: string | null = null;
    if (item?.b64_json) imageUrl = `data:image/png;base64,${item.b64_json}`;
    else if (item?.url) imageUrl = item.url;

    if (!imageUrl) throw new Error("Image generation returned no data");

    return { imageUrl, prompt: fullPrompt };
  });

// =================== ENHANCEMENT FUNCTIONS ===================

/**
 * Enhance or rewrite text
 */
export const enhancePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      text: z.string().min(1, "Text is required"),
      action: z.enum(["Enhance", "Rewrite", "Expand", "Shorten"]),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { text, action } = data;

    const result = await generateText({
      model: googleModel(),
      prompt: `${action} the following text:

"${text}"

Make it better while keeping the core meaning. ${
        action === "Enhance"
          ? "Improve clarity, flow, and impact."
          : action === "Rewrite"
          ? "Give it a fresh angle."
          : action === "Expand"
          ? "Add more detail and context."
          : "Make it more concise."
      }

Return ONLY the enhanced text - no explanation.`,
    });

    return {
      enhancedText: result.text,
    };
  });

/**
 * Critique content and provide feedback
 */
export const critiqueContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      content: z.string().min(1, "Content is required"),
      platform: z.string().default("Instagram"),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { content, platform } = data;

    const result = await generateObject({
      model: googleModel(),
      schema: z.object({
        hookStrength: z.number().min(1).max(10),
        brandVoiceMatch: z.number().min(0).max(100),
        predictedCtr: z.number().min(0).max(10),
        benchmark: z.number().default(2.1),
        readabilityGrade: z.number().min(1).max(12),
        seoScore: z.number().min(0).max(100),
        optimizationTip: z.string(),
      }),
      prompt: `Analyze this ${platform} content and provide scores:

"${content}"

Rate each on a 1-10 scale (or 0-100 where noted):
- Hook strength (1-10)
- Brand voice match (0-100)
- Predicted CTR (1-10%, average is 2.1%)
- Readability grade level (1-12)
- SEO score (0-100)

Provide one actionable optimization tip.

Return ONLY valid JSON - no markdown, no explanation.`,
    });

    return {
      critique: result.object,
    };
  });

/**
 * Generate SEO keyword suggestions with volume / difficulty / intent.
 * 7-day server cache via public.seo_keyword_cache.
 */
export const generateSeoKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({
      query: z.string().min(1, "Query is required"),
      count: z.coerce.number().min(5).max(20).default(10),
      language: z.string().default("English"),
      industry: z.string().optional(),
    }).parse(data);
  })
  .handler(async ({ data, context }) => {
    const { query, count, language, industry } = data;
    const seed = query.trim().toLowerCase();

    // 1) Cache lookup
    const { data: cached } = await context.supabase
      .from("seo_keyword_cache")
      .select("suggestions, expires_at")
      .eq("seed_keyword", seed)
      .eq("language", language.slice(0, 12))
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.suggestions) {
      const arr = cached.suggestions as Array<{ keyword: string; volume: string; difficulty: string; intent: string }>;
      // Back-compat shape used by SeoKeywordPicker
      return {
        keywords: arr.map((k) => ({
          keyword: k.keyword,
          volume: k.volume,
          difficulty: k.difficulty,
          intent: k.intent,
          competition: k.difficulty, // legacy
        })),
      };
    }

    // 2) Generate via Gemini
    const result = await generateObject({
      model: googleModel(),
      schema: z.object({
        keywords: z.array(
          z.object({
            keyword: z.string(),
            volume: z.enum(["High", "Medium", "Low"]),
            difficulty: z.enum(["Easy", "Medium", "Hard"]),
            intent: z.enum(["Informational", "Commercial", "Transactional", "Navigational"]),
          }),
        ).min(1),
      }),
      prompt: `Generate ${count} SEO keyword variations for seed "${query}"${industry ? ` in the ${industry} industry` : ""} for the ${language} market.

For each keyword return:
- keyword: the full keyword phrase (2-6 words, naturally search-worthy)
- volume: estimated monthly search volume bucket — High / Medium / Low
- difficulty: ranking difficulty — Easy / Medium / Hard
- intent: search intent — Informational / Commercial / Transactional / Navigational

Return realistic data a content team would trust. Return ONLY valid JSON.`,
    });

    // 3) Persist cache (fire-and-forget; ignore errors)
    try {
      await context.supabase.from("seo_keyword_cache").insert({
        seed_keyword: seed,
        language: language.slice(0, 12),
        suggestions: result.object.keywords,
      });
    } catch { /* ignore */ }

    return {
      keywords: result.object.keywords.map((k) => ({
        ...k,
        competition: k.difficulty, // legacy alias
      })),
    };
  });

/**
 * Suggest thumbnail headline + subheading from an image (or topic).
 * Used by Thumbnail Generator when a user uploads an image.
 */
export const suggestThumbnailText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    topic: z.string().default(""),
    imageDataUrl: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { topic, imageDataUrl } = data;
    const userContent: any = imageDataUrl
      ? [
          { type: "text", text: `Suggest a high-CTR YouTube thumbnail headline (max 5 words, ALL CAPS) and subheading (max 8 words) for this image${topic ? ` about: ${topic}` : ""}. Make it curiosity-inducing and benefit-driven.` },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ]
      : `Suggest a high-CTR YouTube thumbnail headline (max 5 words, ALL CAPS) and subheading (max 8 words) for a video about: ${topic || "an engaging video"}. Make it curiosity-inducing and benefit-driven.`;

    const result = await generateObject({
      model: googleModel(),
      schema: z.object({ headline: z.string(), subheading: z.string() }),
      messages: [{ role: "user", content: userContent }] as any,
    });
    return result.object;
  });

// Legacy placeholders kept for backward compatibility
export const generatePoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().default(""),
    description: z.string().default(""),
    theme: z.string().default("Modern"),
    colors: z.array(z.string()).default(["#4f46e5", "#7c3aed", "#0ea5e9", "#f8fafc"]),
    aspectRatio: z.string().default("4:5"),
  }).parse(data))
  .handler(async () => ({ posterData: "Use generateImage instead" }));

export const generateThumbnail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    headline: z.string().min(1, "Headline is required"),
    subheading: z.string().default(""),
    style: z.string().default("Bold"),
    brandColor: z.string().default("#ef4444"),
  }).parse(data))
  .handler(async () => ({ thumbnailData: "Use generateImage instead" }));

