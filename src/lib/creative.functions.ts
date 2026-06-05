// Creative Engine Server Functions — Real AI Generation
// Using Google Gemini API directly for text and image generation

import { createServerFn } from "@tanstack/react-start";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

// Use higher-tier Gemini Pro for the strongest text/structured outputs.
const googleModel = () => {
  const apiKey = process.env.LOVABLE_API_KEY;
  return apiKey ? createLovableAiGatewayProvider(apiKey)("google/gemini-2.5-pro") : null;
};

function getImageGenerationErrorMessage(status: number, body: string) {
  if (status === 402) return "AI credits exhausted. Add credits in Settings → Workspace → Usage.";
  if (status === 429) return "Rate limit exceeded. Please try again in a moment.";
  return `Image generation failed (${status}): ${body.slice(0, 200)}`;
}

function getCreativeAiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/AI credits exhausted|Payment Required|402/i.test(message)) {
    return "AI credits exhausted. Add credits in Settings → Workspace → Usage.";
  }
  if (/rate limit|429/i.test(message)) {
    return "Rate limit exceeded. Please try again in a moment.";
  }
  if (/LOVABLE_API_KEY|api key|unauthorized|401/i.test(message)) {
    return "AI generation is not configured for this workspace.";
  }
  return "AI generation is temporarily unavailable. Please try again.";
}

function wordsFrom(input: string, fallback = "brand") {
  const words = input.toLowerCase().match(/[a-z0-9]+/g) || [fallback];
  return Array.from(new Set(words.filter((word) => word.length > 2))).slice(0, 12);
}

function titleCase(input: string) {
  return input.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function escapeXml(input: string) {
  return input.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

function fallbackHashtags(seed: string, count = 15) {
  const base = wordsFrom(seed, "marketing");
  const defaults = ["BrandGrowth", "MarketingStrategy", "DigitalMarketing", "ContentMarketing", "SocialMedia", "BusinessGrowth", "CreativeStrategy", "OnlineBusiness", "BrandAwareness", "GrowthMarketing"];
  return Array.from(new Set([...base.map(titleCase), ...defaults])).slice(0, count).map((tag) => tag.replace(/\s+/g, ""));
}

function fallbackImageDataUrl(kind: string, prompt: string, style: string, aspectRatio: string, extras?: Record<string, any>) {
  const [w, h] = aspectRatio.includes("16:9") || aspectRatio.includes("1280") ? [1280, 720] : aspectRatio.includes("4:5") ? [1080, 1350] : aspectRatio.includes("9:16") ? [1080, 1920] : [1080, 1080];
  const title = escapeXml(String(extras?.title || extras?.headline || titleCase(kind.replace(/-/g, " "))));
  const subtitle = escapeXml(String(extras?.subtitle || extras?.subheading || style || "Creative Preview"));
  const body = escapeXml(prompt.slice(0, 120));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4f46e5"/><stop offset="0.52" stop-color="#7c3aed"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient><pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M72 0H0v72" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="#080817"/><rect width="100%" height="100%" fill="url(#g)" opacity=".82"/><rect width="100%" height="100%" fill="url(#grid)" opacity=".5"/><circle cx="${w * 0.82}" cy="${h * 0.18}" r="${Math.min(w, h) * 0.22}" fill="rgba(255,255,255,.16)"/><rect x="${w * 0.08}" y="${h * 0.12}" width="${w * 0.84}" height="${h * 0.76}" rx="28" fill="rgba(8,8,23,.38)" stroke="rgba(255,255,255,.24)"/><text x="${w * 0.12}" y="${h * 0.25}" fill="white" font-family="Arial, sans-serif" font-size="${Math.max(34, w * 0.045)}" font-weight="800">${title}</text><text x="${w * 0.12}" y="${h * 0.34}" fill="rgba(255,255,255,.82)" font-family="Arial, sans-serif" font-size="${Math.max(20, w * 0.023)}" font-weight="600">${subtitle}</text><foreignObject x="${w * 0.12}" y="${h * 0.43}" width="${w * 0.66}" height="${h * 0.25}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:rgba(255,255,255,.9);font-size:${Math.max(22, w * 0.026)}px;line-height:1.22;font-weight:700;">${body}</div></foreignObject><text x="${w * 0.12}" y="${h * 0.8}" fill="rgba(255,255,255,.74)" font-family="Arial, sans-serif" font-size="${Math.max(16, w * 0.018)}" font-weight="700">Generated in Free Mode</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function runTextGeneration(options: any) {
  try {
    if (!options.model) return { text: null, error: "AI generation is not configured for this workspace." };
    const result = await generateText(options);
    return { text: result.text, error: null };
  } catch (error) {
    console.error("Creative text generation failed:", error);
    return { text: null, error: getCreativeAiErrorMessage(error) };
  }
}

async function runObjectGeneration<T>(options: any) {
  try {
    if (!options.model) return { object: null, error: "AI generation is not configured for this workspace." };
    const result = await generateObject(options);
    return { object: result.object as T, error: null };
  } catch (error) {
    console.error("Creative structured generation failed:", error);
    return { object: null, error: getCreativeAiErrorMessage(error) };
  }
}

// =================== TEXT GENERATION FUNCTIONS ===================

/**
 * Generate social media caption with emojis and hashtags
 */
export const generateCaption = createServerFn({ method: "POST" })
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

    const result = await runTextGeneration({
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

    if (result.error) {
      const tags = fallbackHashtags(`${description} ${platform}`, 6).map((tag) => `#${tag}`).join(" ");
      return { caption: `${description}\n\nBuilt for ${platform} with a ${tone.toLowerCase()} tone. ${tags}`, error: null, fallback: true };
    }

    return {
      caption: result.text,
      error: null,
    };
  });

/**
 * Generate hashtags segmented by category
 */
export const generateHashtags = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return z.object({
      industry: z.string().min(1, "Industry is required"),
      platform: z.string().default("Instagram"),
      count: z.coerce.number().min(5).max(30).default(15),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { industry, platform, count } = data;

    const result = await runObjectGeneration<{ trending: string[]; niche: string[]; broad: string[] }>({
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

    if (result.error || !result.object) {
      const tags = fallbackHashtags(`${industry} ${platform}`, count);
      return {
        hashtags: {
          trending: tags.slice(0, Math.ceil(count / 3)),
          niche: tags.slice(Math.ceil(count / 3), Math.ceil((count * 2) / 3)),
          broad: tags.slice(Math.ceil((count * 2) / 3), count),
        },
        error: null,
        fallback: true,
      };
    }

    return {
      hashtags: result.object,
      error: null,
    };
  });

/**
 * Generate full blog post with markdown
 */
export const generateBlog = createServerFn({ method: "POST" })
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

    const result = await runTextGeneration({
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

    if (result.error || !result.text) {
      const topic = topics[0] || "Marketing Strategy";
      const sections = Array.from({ length: headings }, (_, i) => `## ${i + 1}. ${titleCase(wordsFrom(`${topic} ${description || ""}`)[i % Math.max(1, wordsFrom(topic).length)] || "Growth")}\n\nUse this section to connect ${topic.toLowerCase()} with a clear customer problem, a practical solution, and one measurable next step.`).join("\n\n");
      const blogPost = `# ${titleCase(topic)}\n\n${description || `A practical guide for teams working on ${topic.toLowerCase()}.`}\n\n${sections}\n\n## Conclusion\n\nTurn these ideas into a focused campaign, measure the response, and refine the message after each launch.`;
      return { blogPost, wordCount: blogPost.split(/\s+/).length, error: null, fallback: true };
    }

    return {
      blogPost: result.text,
      wordCount: result.text.split(/\s+/).length,
      error: null,
    };
  });

/**
 * Generate product description
 */
export const generateProductDescription = createServerFn({ method: "POST" })
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

    const result = await runTextGeneration({
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

    if (result.error) {
      return { description: `${productName}\n\n${description}\n\nKey benefits:\n- Built for ${tone.toLowerCase()} teams that need clear value fast.\n- Designed to communicate outcomes, not just features.\n- Optimized for customers comparing options and ready to act.\n\nWhy it works: this ${style.toLowerCase()} description highlights the product promise, reinforces trust, and gives buyers a simple next step.`, error: null, fallback: true };
    }

    return {
      description: result.text,
      error: null,
    };
  });

/**
 * Generate YouTube script with sections
 */
export const generateScript = createServerFn({ method: "POST" })
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

    const result = await runObjectGeneration<{ hook: string; intro: string; body: string; cta: string; outro: string }>({
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

    if (result.error || !result.object) {
      return { script: { hook: `What if ${topic.toLowerCase()} could be simpler than you think?`, intro: `In this video, we’ll break down ${topic} for ${audience.join(", ") || "your audience"}.`, body: `1. Define the problem clearly.\n2. Show the practical workflow.\n3. Share an example viewers can apply today.\n4. Recap the biggest takeaway.`, cta: "If this helped, save it, share it, and take the next step with your team.", outro: "Thanks for watching — use this framework in your next campaign." }, error: null, fallback: true };
    }

    return {
      script: result.object,
      error: null,
    };
  });

// =================== IMAGE GENERATION FUNCTIONS ===================

/**
 * Generate marketing image via Lovable AI Gateway (returns base64 data URL).
 * Used by Image Lab, Poster, Try-On, Holography, Product Photography, Thumbnail.
 */
export const generateImage = createServerFn({ method: "POST" })
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
      return { imageUrl: fallbackImageDataUrl(kind, prompt, style, aspectRatio, extras), prompt, error: null, fallback: true };
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
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    }).catch((error) => {
      console.error("Image generation request failed:", error);
      return null;
    });

    if (!resp) {
      return { imageUrl: fallbackImageDataUrl(kind, prompt, style, aspectRatio, extras), prompt: fullPrompt, error: null, fallback: true };
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { imageUrl: fallbackImageDataUrl(kind, prompt, style, aspectRatio, extras), prompt: fullPrompt, error: null, fallback: true };
    }

    const json: any = await resp.json().catch(() => null);
    const item = json?.data?.[0];
    let imageUrl: string | null = null;
    if (item?.b64_json) imageUrl = `data:image/png;base64,${item.b64_json}`;
    else if (item?.url) imageUrl = item.url;

    if (!imageUrl) {
      return { imageUrl: fallbackImageDataUrl(kind, prompt, style, aspectRatio, extras), prompt: fullPrompt, error: null, fallback: true };
    }

    return { imageUrl, prompt: fullPrompt, error: null };
  });

// =================== ENHANCEMENT FUNCTIONS ===================

/**
 * Enhance or rewrite text
 */
export const enhancePrompt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return z.object({
      text: z.string().min(1, "Text is required"),
      action: z.enum(["Enhance", "Rewrite", "Expand", "Shorten"]),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { text, action } = data;

    const result = await runTextGeneration({
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

    if (result.error) return { enhancedText: null, error: result.error };

    return {
      enhancedText: result.text,
      error: null,
    };
  });

/**
 * Critique content and provide feedback
 */
export const critiqueContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return z.object({
      content: z.string().min(1, "Content is required"),
      platform: z.string().default("Instagram"),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { content, platform } = data;

    const result = await runObjectGeneration<{ hookStrength: number; brandVoiceMatch: number; predictedCtr: number; benchmark: number; readabilityGrade: number; seoScore: number; optimizationTip: string }>({
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

    if (result.error || !result.object) return { critique: null, error: result.error };

    return {
      critique: result.object,
      error: null,
    };
  });

/**
 * Generate SEO keywords
 */
export const generateSeoKeywords = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return z.object({
      query: z.string().min(1, "Query is required"),
      count: z.coerce.number().min(5).max(20).default(10),
    }).parse(data);
  })
  .handler(async ({ data }) => {
    const { query, count } = data;

    const result = await runObjectGeneration<{ keywords: Array<{ keyword: string; volume: number; competition: "Low" | "Medium" | "High" }> }>({
      model: googleModel(),
      schema: z.object({
        keywords: z.array(
          z.object({
            keyword: z.string(),
            volume: z.number(),
            competition: z.enum(["Low", "Medium", "High"]),
          })
        ),
      }),
      prompt: `Generate ${count} SEO keyword variations for: "${query}"

For each keyword, provide:
- The keyword phrase
- Estimated monthly search volume (rough number)
- Competition level (Low/Medium/High)

Return realistic SEO data for content optimization. Return ONLY valid JSON - no markdown.`,
    });

    if (result.error || !result.object) return { keywords: [], error: result.error };

    return {
      keywords: result.object.keywords,
      error: null,
    };
  });

// Additional placeholder functions for poster and thumbnail
export const generatePoster = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().default(""),
    description: z.string().default(""),
    theme: z.string().default("Modern"),
    colors: z.array(z.string()).default(["#4f46e5", "#7c3aed", "#0ea5e9", "#f8fafc"]),
    aspectRatio: z.string().default("4:5"),
  }).parse(data))
  .handler(async ({ data }) => {
    return {
      posterData: "Poster generation requires image output - coming soon",
    };
  });

export const generateThumbnail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    headline: z.string().min(1, "Headline is required"),
    subheading: z.string().default(""),
    style: z.string().default("Bold"),
    brandColor: z.string().default("#ef4444"),
  }).parse(data))
  .handler(async ({ data }) => {
    return {
      thumbnailData: "Thumbnail generation requires image output - coming soon",
    };
  });
