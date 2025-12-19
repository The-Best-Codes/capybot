import { openrouter } from "@openrouter/ai-sdk-provider";

export const globalModel = openrouter("x-ai/grok-4.1-fast", {
  reasoning: {
    enabled: false,
    exclude: true,
    max_tokens: 0,
  },
});
export const attachmentModel = openrouter(
  "nvidia/nemotron-nano-12b-v2-vl:free",
);
