import { Type, type GenerateContentParameters } from "@google/genai";
import { genAI } from "../../../clients/googleAi";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function browseUrlFn({
  urls,
  prompt,
}: {
  urls: string[];
  prompt: string;
}): Promise<{
  success: boolean;
  analysis?: string;
  message?: string;
  error?: any;
}> {
  try {
    const urlTool = {
      urlContext: {},
    };

    const config = {
      tools: [urlTool],
    };

    const request: GenerateContentParameters = {
      model: process.env.GEMINI_BROWSE_MODEL || "gemini-2.0-flash",
      contents: [
        { parts: [{ text: `${prompt}\n\n[URLs: ${urls.join(", ")}]` }] },
      ],
      config,
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
    logger.error("URL browsing failed:", error);
    return {
      success: false,
      message: "Failed to browse URLs",
      error,
    };
  }
}

export const browseUrl: ToolDefinition = {
  name: "browse_url",
  description: "Browses a URL for information using natural language.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      urls: {
        type: Type.ARRAY,
        description: "A list of URLs to browse.",
        items: {
          type: Type.STRING,
          description: "A URL to browse.",
        },
      },
      prompt: {
        type: Type.STRING,
        description:
          "A detailed prompt describing what information to browse for overall. Be specific about the type of analysis required (e.g., in-depth analysis, general outline, key points, basic summary). This should be provided by you, the model, and not the user unless they specifically request it.",
      },
    },
    required: ["urls", "prompt"],
  },
  function: browseUrlFn,
};
