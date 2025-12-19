import { generateText, tool } from "ai";
import { z } from "zod";
import { globalModel } from "../../../clients/ai";

export const createGetAttachmentDescriptionTool = () =>
  tool({
    description:
      "Get a summary/description of an attachment from a URL. Fetches the file and uses AI to analyze it.",
    inputSchema: z.object({
      url: z.string().describe("The URL of the attachment to describe"),
      customPrompt: z
        .string()
        .optional()
        .describe(
          "Optional custom prompt to use when describing the attachment. If not provided, uses a default verbose description prompt.",
        ),
    }),
    execute: async ({ url, customPrompt }) => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          return {
            success: false,
            error: `Failed to fetch attachment: ${response.statusText}`,
            url,
          };
        }

        const contentType = response.headers.get("content-type") || "";
        const buffer = await response.arrayBuffer();

        if (contentType.startsWith("image/")) {
          const defaultPrompt =
            "Give a very verbose description of this image. Describe all visible elements, text, colors, composition, and any other notable details.";
          const prompt = customPrompt || defaultPrompt;

          const result = await generateText({
            model: globalModel,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image",
                    image: Buffer.from(buffer),
                  },
                ],
              },
            ],
          });

          return {
            success: true,
            summary: result.text,
          };
        }

        if (
          contentType.startsWith("text/") ||
          contentType.includes("json") ||
          contentType.includes("xml")
        ) {
          const text = new TextDecoder().decode(buffer);

          const maxLength = 10000;
          const truncatedText =
            text.length > maxLength
              ? text.substring(0, maxLength) + "\n\n[Content truncated...]"
              : text;

          const defaultPrompt = `Give a very verbose description of this file. Here is the content:\n\n${truncatedText}`;
          const prompt = customPrompt || defaultPrompt;

          const result = await generateText({
            model: globalModel,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          return {
            success: true,
            summary: result.text,
          };
        }

        return {
          success: false,
          error: `Unsupported content type: ${contentType}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
