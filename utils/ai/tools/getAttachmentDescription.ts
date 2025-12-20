import { generateText, tool } from "ai";
import { z } from "zod";
import { attachmentModel } from "../../../clients/ai";
import { logger } from "../../logger";

export const createGetAttachmentDescriptionTool = () =>
  tool({
    description:
      "Get a summary/description of an attachment from a URL. Fetches the file and uses AI to analyze it.",
    inputSchema: z.object({
      url: z.string().describe("The URL of the attachment to describe"),
      mediaType: z
        .string()
        .optional()
        .describe(
          "The MIME type of the file (e.g., 'image/png', 'application/pdf')",
        ),
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

        const result = await generateText({
          system: "/no_think", // Disable reasoning for nvidia/nemotron-nano-12b-v2-vl:free
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
                  mediaType: mediaType || "application/octet-stream",
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
