import { openrouter } from "@openrouter/ai-sdk-provider";

export const globalModel = openrouter("x-ai/grok-4.1-fast", {
  reasoning: {
    enabled: false,
    exclude: true,
    max_tokens: 0,
  },
});
export const attachmentModel = openrouter(
  "google/gemini-2.0-flash-lite-001",
);
