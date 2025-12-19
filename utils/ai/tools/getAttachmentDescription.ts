import { generateText, tool } from "ai";
import { z } from "zod";
import { globalModel } from "../../../clients/ai";

export const createGetAttachmentDescriptionTool = () =>
  tool({
    description:
      "Get a summary/description of an attachment from a URL. Fetches the file and uses AI to analyze it.",
    inputSchema: z.object({
      url: z.string().describe("The URL of the attachment to describe"),
      fileName: z
        .string()
        .optional()
        .describe("Optional file name for context"),
    }),
    execute: async ({ url, fileName }) => {
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
          const result = await generateText({
            model: globalModel,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Please provide a brief, concise summary of this image${fileName ? ` (${fileName})` : ""}. Focus on the main content and key details.`,
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
            contentType,
            fileName,
            url,
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

          const result = await generateText({
            model: globalModel,
            messages: [
              {
                role: "user",
                content: `Please provide a brief, concise summary of the following ${contentType} content${fileName ? ` (${fileName})` : ""}: \n\n${truncatedText}`,
              },
            ],
          });

          return {
            success: true,
            summary: result.text,
            contentType,
            fileName,
            url,
          };
        }

        return {
          success: false,
          error: `Unsupported content type: ${contentType}`,
          url,
          fileName,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          url,
          fileName,
        };
      }
    },
  });
