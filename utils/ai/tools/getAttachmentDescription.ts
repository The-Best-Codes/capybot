import { generateText, tool } from "ai";
import { z } from "zod";
import { attachmentModel } from "../../../clients/ai";
import { logger } from "../../logger";

function detectMediaType(url: string, providedMediaType?: string): string {
  try {
    if (providedMediaType && providedMediaType !== "application/octet-stream") {
      return providedMediaType;
    }

    const urlPath = url.split("?")[0];
    const extension = urlPath.split(".").pop()?.toLowerCase();

    const extensionMap: Record<string, string> = {
      // Images
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",
      // Documents
      pdf: "application/pdf",
      // Text
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      xml: "application/xml",
      // Video
      mp4: "video/mp4",
      webm: "video/webm",
      // Audio
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };

    return extensionMap[extension || ""] || "image/png";
  } catch (error) {
    logger.error("Error detecting media type", error);
    return "image/png";
  }
}

export const createGetAttachmentDescriptionTool = () =>
  tool({
    description:
      "Get a summary/description of an attachment from a URL. Fetches the file and uses AI to analyze it.",
    inputSchema: z.object({
      url: z.string().describe("The URL of the attachment to describe"),
      mediaType: z
        .string()
        .optional()
        .describe("The MIME type of the file (e.g., 'image/png', 'application/pdf')"),
      customPrompt: z
        .string()
        .optional()
        .describe(
          "Optional custom prompt to use when describing the attachment. If not provided, uses a default verbose description prompt.",
        ),
    }),
    execute: async ({ url, mediaType, customPrompt }) => {
      try {
        const defaultPrompt =
          "Give a very verbose description of this attachment. Describe all visible elements, content, and any other notable details.";
        const prompt = customPrompt || defaultPrompt;

        const detectedMediaType = detectMediaType(url, mediaType);

        const result = await generateText({
          model: attachmentModel,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "file",
                  data: url,
                  mediaType: detectedMediaType,
                },
              ],
            },
          ],
          maxOutputTokens: 2048,
        });

        return {
          success: true,
          summary: result.text,
        };
      } catch (error) {
        logger.error("Error generating attachment description:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
