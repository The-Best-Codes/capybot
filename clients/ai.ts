import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const aiProvider = createOpenAICompatible({
  name: "openai-compatible",
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || "",
  includeUsage: true,
});

export const globalModel = aiProvider(process.env.AI_GLOBAL_MODEL || "gemini-3-flash-preview");
export const attachmentModel = aiProvider(
  process.env.AI_ATTACHMENT_MODEL || "gemini-2.5-flash-lite",
);
