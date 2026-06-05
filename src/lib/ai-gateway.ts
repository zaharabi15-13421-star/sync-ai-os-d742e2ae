import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lovable AI Gateway provider (OpenAI-compatible).
 * Uses the workspace-level LOVABLE_API_KEY so every signed-in user can call
 * AI models without needing their own API key.
 *
 * Usage: provider("google/gemini-2.5-flash")
 */
export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

/** Convenience: build a model from LOVABLE_API_KEY in env. Throws if missing. */
export function lovableModel(modelId: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  return createLovableAiGatewayProvider(apiKey)(modelId);
}
