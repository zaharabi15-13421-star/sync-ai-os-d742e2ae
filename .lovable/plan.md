# Creative Engine — World-Class Upgrade Plan

This is a large, multi-module upgrade across the entire Creative Engine. Before I start writing code I need to confirm a few platform-level decisions, because the spec asks for things that don't match how this project is built. I want to do this correctly the first time rather than rebuild later.

---

## Decisions I need confirmed

### 1. Backend layer: Edge Functions vs TanStack Server Functions
The spec says "API routing must happen exclusively through Supabase Edge Functions." However, this project is built on **TanStack Start** and the existing Creative Engine already uses **TanStack `createServerFn`** (`src/lib/creative.functions.ts`) — not edge functions. The platform guidance for this stack is also: *do NOT use Supabase Edge Functions for app-internal logic*.

Two options:
- **A (recommended):** Keep using TanStack server functions (`createServerFn`) for all new endpoints. Same security model (auth middleware, secrets server-side), same UX (SSE streaming via a server route under `src/routes/api/`), no architectural drift. This matches existing code and is what Lovable Cloud + TanStack expects.
- **B:** Force everything through Supabase Edge Functions as written. Means duplicating auth, rewriting the existing working server fns, and fighting the stack.

I strongly recommend **A**. Functionally identical for the user; correct for this codebase.

### 2. AI models: GPT-4o + Gemini 2.5 Pro vs Lovable AI Gateway
The spec hard-pins `openai/gpt-4o` and `google/gemini-2.5-pro` and asks for `OPENAI_API_KEY` + `GOOGLE_GEMINI_API_KEY` secrets. This project uses the **Lovable AI Gateway** (`LOVABLE_API_KEY`, already provisioned) which proxies to both providers with no extra keys needed and is the project's existing pattern.

Options:
- **A (recommended):** Use Lovable AI Gateway. Text → `openai/gpt-5` (the GPT-4o equivalent; gpt-4o is not in the catalog) or `google/gemini-2.5-pro`. Image → `google/gemini-3-pro-image-preview` (current best image model — the spec's "gemini-2.5-pro image generation" doesn't exist; 2.5-pro is text-only, image gen is via the `*-image` variants). No new secrets.
- **B:** Add `OPENAI_API_KEY` + `GOOGLE_GEMINI_API_KEY` and call providers directly. Requires you to supply both keys and pay providers directly.

I recommend **A** with `openai/gpt-5` for text and `google/gemini-3-pro-image-preview` for images — these are the closest spec-equivalent models available in the gateway.

### 3. Scope sequencing
This is ~17 sections of work. I can either:
- **A (recommended):** Ship in 3 phases so you can review after each:
  1. **Phase 1 — Foundation:** DB schema (4 tables + storage bucket), RAG context builder, shared hooks (`usePromptEnhancement`, `useCreativeGenerate`, `useImageGenerate`, `useSEOKeywords`, `useFileAttachment`), shared components (`GenerationOutput`, `StreamingTextOutput`, `SEOKeywordInput`, `FileAttachmentInput`, `PromptEnhancementButtons`), streaming server route, generate text/image/enhance/seo/extract server fns.
  2. **Phase 2 — Module rewiring:** Image Lab, Poster Studio, Virtual Try-On, Product Holography, Thumbnail Generator, Product Description, Script Writer, Blog Pilot — wire each to the new backend, add Section 6–13 field/label/dropdown changes.
  3. **Phase 3 — Polish:** History panel, quality scoring, caching, rate limiting, accessibility, error states.
- **B:** All at once in one giant batch.

I recommend **A** — safer, you see progress sooner, easier to catch design issues early.

### 4. Rate limiting
Spec asks for per-user hourly/daily limits. This backend has no standard rate-limit primitive — we'd build ad-hoc counters in a new table. Confirm you want me to build that, or skip rate limiting (recommended for now — add later when proper infra exists).

### 5. Content moderation
Spec asks for harmful-content checks. OpenAI Moderation API isn't free via the Lovable Gateway. Options: (a) skip — rely on the underlying model's built-in safety, (b) add a lightweight GPT-5 classification pass per generation (adds latency + cost). Recommend **(a)**.

---

## What I will build (assuming A on every question above)

### Database (Phase 1)
- `creative_generations`, `creative_context_memory`, `seo_keyword_cache`, `blog_attachments` — exactly per Section 2, with RLS and grants.
- Storage bucket `creative-assets` (private) with `uploads/{user_id}/` and `outputs/{user_id}/` paths, RLS on `storage.objects`.

### Backend (Phase 1)
- `src/lib/creative-ai.functions.ts` — `enhanceText`, `generateText` (returns full text — for non-streaming use), `generateImage`, `seoKeywordSuggestions`, `extractFileContext`, `logGeneration`. All `createServerFn` with `requireSupabaseAuth`.
- `src/routes/api/creative/stream-text.ts` — server route for SSE streaming text generation (TanStack requires server routes for streaming, not server fns).
- `src/lib/rag-context.server.ts` — Layer 1–4 context assembly from `brand_summary` + `creative_context_memory` + module hints + attachments.
- `src/lib/creative-prompts.server.ts` — module-specific system prompts exactly as Section 4.

### Shared frontend (Phase 1)
- Hooks: `useCreativeGenerate` (SSE consumer), `useImageGenerate`, `useSEOKeywords` (debounced + cached), `useFileAttachment`, `usePromptEnhancement` (sessionStorage cache), `useGenerationHistory`.
- Components: `PromptEnhancementButtons`, `StreamingTextOutput` (blinking cursor + word-by-word), `GenerationOutput` (idle/loading/streaming/complete/error states), `GenerationHistory` (last 3), `SEOKeywordInput` (chips + AI suggestion dropdown with volume/difficulty/intent badges), `FileAttachmentInput` (paperclip/photo toolbar, chips, context extraction), `EnhancementStyleDropdown` (None default).

### Module updates (Phase 2)
Each module is a surgical edit to the existing component in `src/components/creative/features.tsx`, preserving every existing field, V1/V2/V3 tabs, tone chips, action bar, Brand DNA badge, stats header, and Ask Mr. Zarvis button:
- **Image Lab** — add "None" as first/default option in Enhancement Style; wire Generate + Enhance buttons; rename "Prompt" → "Describe Your Image".
- **Poster Studio** — add "MODEL / FEATURED IMAGE" upload section; wire Generate; improve labels.
- **Virtual Try-On** — improve labels; wire Generate Self Model + Enhance buttons.
- **Product Holography** — improve labels; wire Generate + Enhance.
- **Thumbnail Generator** — rename fields; replace style dropdown with 4 options (Professional/Bold/Fun/Minimal) with descriptions; on image upload auto-suggest headline+subheading via GPT-5; wire Generate.
- **Smart Script Writer** — add "Video Goal" searchable dropdown with 12 predefined + custom-goal-add; wire Generate Script with SSE streaming.
- **Blog Pilot** — convert description into rich input with paperclip/photo upload toolbar + attachment chips; transform SEO Focus Keywords into intelligent tag input with AI suggestion dropdown; wire Generate with SSE.
- **Product Description** — same intelligent SEO keyword input; rename "Short Description" → "Key Product Information"; wire Generate with SSE.

### Universal (Phase 3)
- Real-time SSE streaming on text outputs with blinking cursor.
- Animated image-gen progress state with prompt preview.
- Generation history (last 3) per module in right panel.
- Wired Download/Enhance buttons on output.
- Loading/error/timeout states per Section 14.
- Real-time character count with color coding.
- Custom tone chip add → save to `creative_context_memory`.
- V2/V3 pre-generation in background after V1 completes (image modules).
- Accessibility per Section 18 (aria-live, aria-labels, roles).

---

## Technical notes
- **Streaming:** TanStack Start can't stream from `createServerFn` (typed RPC serializes return). Streaming text uses a server route at `/api/creative/stream-text` returning SSE. Client uses native `EventSource`/`fetch` reader. Image gen is non-streaming and stays in `createServerFn`.
- **RAG sources:** Brand context pulled from existing `brand_summary` table for the current user. `creative_context_memory` is upserted on every generation (last 10 topics rolling, preferred_tone counter, style_history per module).
- **File extraction:** Images → GPT-5 vision describe; PDF → `pdf-parse` (Node-compatible in Worker); TXT/CSV → direct read; DOCX → `mammoth` (Worker-compatible).
- **Quality score:** Calculated server-side via the 5-factor rubric in Section 5, stored on `creative_generations.quality_score`.
- **V2/V3 variation:** temperature 0.85/0.95 + explicit "create significantly different variation" instruction appended to user prompt.
- **Caching:** `sessionStorage` for enhance results (30 min, keyed by `hash(operation+text+tone)`); `localStorage` for SEO keywords (24h) layered over the 7-day server cache; per-module component state for image URLs across V1/V2/V3.
- **Preserved exactly:** every existing field, route, navigation, action bar, tone chips, stats header, Brand DNA badge, Mr. Zarvis button, V1/V2/V3 tabs.

---

## Please confirm before I build:
1. Backend: **A** TanStack server functions (recommended) or **B** force Supabase Edge Functions?
2. Models: **A** Lovable AI Gateway with `openai/gpt-5` + `google/gemini-3-pro-image-preview` (recommended) or **B** add your own OpenAI + Gemini keys?
3. Sequencing: **A** 3 phases (recommended) or **B** all at once?
4. Rate limiting: build it now, or skip until proper infra?
5. Content moderation: skip (recommended) or add GPT-5 classification pass?

Once you confirm, I'll start Phase 1.
