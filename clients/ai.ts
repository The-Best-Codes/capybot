import { openrouter } from "@openrouter/ai-sdk-provider";

// export const globalModel = openrouter("xiaomi/mimo-v2-flash:free");
export const globalModel = openrouter("google/gemini-3-flash-preview");
export const attachmentModel = openrouter(
  "nvidia/nemotron-nano-12b-v2-vl:free",
);
