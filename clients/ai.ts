import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const heliconeProvider = createOpenAICompatible({
  name: "helicone",
  apiKey: process.env.HELICONE_AI_API_KEY,
  baseURL: "https://ai-gateway.helicone.ai",
  includeUsage: true,
});

// export const globalModel = openrouter("xiaomi/mimo-v2-flash:free");
export const globalModel = heliconeProvider("claude-4.5-haiku");
// export const attachmentModel = openrouter("nvidia/nemotron-nano-12b-v2-vl:free");
export const attachmentModel = heliconeProvider("gemini-2.5-flash-lite");
