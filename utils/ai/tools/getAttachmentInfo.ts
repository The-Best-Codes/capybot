import { Type, type GenerateContentParameters, type Part } from "@google/genai";
import { genAI } from "../../../clients/googleAi";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function getAttachmentInfoFn({
  prompt,
  url,
  contentType,
}: {
  prompt: string;
  url: string;
  contentType?: string;
}): Promise<{
  success: boolean;
  analysis?: string;
  message?: string;
  error?: any;
}> {
  try {
    async function urlToGeminiPart(
      url: string,
      mimeType?: string,
    ): Promise<Part> {
      try {
        const urlObj = new URL(url);
        if (!["http:", "https:"].includes(urlObj.protocol)) {
          throw new Error("Only HTTP and HTTPS URLs are allowed");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "CapyBot/1.0" },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch attachment from URL: ${url}. Status: ${response.status} ${response.statusText}`,
          );
        }

        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > 20 * 1024 * 1024) {
          throw new Error("Attachment too large (max 20MB)");
        }

        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        const inferredMimeType =
          mimeType ||
          response.headers.get("content-type") ||
          "application/octet-stream";

        return {
          inlineData: {
            data: Buffer.from(uint8Array).toString("base64"),
            mimeType: inferredMimeType,
          },
        };
      } catch (error: any) {
        throw new Error(
          `Error fetching or processing attachment from URL: ${url}. ${error.message}`,
        );
      }
    }

    const attachmentPart = await urlToGeminiPart(url, contentType);

    const request: GenerateContentParameters = {
      model: process.env.GEMINI_ATTACHMENT_MODEL || "gemini-2.0-flash",
      contents: [{ parts: [{ text: prompt }, attachmentPart] }],
    };

    const result = await genAI.models.generateContent(request);
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return {
        success: false,
        message: "No response from the AI model.",
      };
    }

    return {
      success: true,
      analysis: responseText,
    };
  } catch (error: any) {
    logger.error("Attachment analysis failed:", error);
    return {
      success: false,
      message: "Failed to analyze attachment",
      error,
    };
  }
}

export const getAttachmentInfo: ToolDefinition = {
  name: "get_attachment_info",
  description:
    "Retrieves information about an attachment (image, video, audio, or text) from a given URL. It analyzes the attachment based on a provided prompt and returns a summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description:
          "A detailed prompt describing what information to extract from the attachment. Be specific about the type of analysis required (e.g., in-depth analysis, general outline, key points). This should be provided by you, the model, and not the user unless they specifically request it.",
      },
      url: {
        type: Type.STRING,
        description: "The URL of the attachment to analyze.",
      },
      contentType: {
        type: Type.STRING,
        description:
          "The content type of the attachment (e.g., image/png, text/plain, video/mp4, audio/mp3, application/pdf). If not provided, the tool will attempt to infer it.",
      },
    },
    required: ["prompt", "url"],
  },
  function: getAttachmentInfoFn,
};
