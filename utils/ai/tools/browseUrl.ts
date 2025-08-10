import { Type, type GenerateContentParameters } from "@google/genai";
import { genAI } from "../../../clients/googleAi";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function browseUrlFn({
  url,
  prompt,
}: {
  url: string;
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
      contents: [{ parts: [{ text: `${prompt}\n\n[URLs:\n${url}]` }] }],
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
      url: {
        type: Type.STRING,
        description: "A URL to browse.",
      },
      prompt: {
        type: Type.STRING,
        description:
          "A detailed prompt describing what information to browse for overall. Be specific about the type of analysis required (e.g., in-depth analysis, general outline, key points, basic summary). This should be provided by you, the model, and not the user unless they specifically request it.",
      },
    },
    required: ["url", "prompt"],
  },
  function: browseUrlFn,
};
