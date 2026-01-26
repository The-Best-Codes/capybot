import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const heliconeAiProvider = createOpenAICompatible({
  name: "helicone",
  apiKey: process.env.HELICONE_AI_API_KEY,
  baseURL: "https://ai-gateway.helicone.ai",
  includeUsage: true,
});

// export const globalModel = openrouter("xiaomi/mimo-v2-flash:free");
export const globalModel = heliconeAiProvider("google/gemini-3-flash-preview");
// export const attachmentModel = openrouter("nvidia/nemotron-nano-12b-v2-vl:free");
export const attachmentModel = heliconeAiProvider(
  "google/gemini-2.5-flash-lite",
);
