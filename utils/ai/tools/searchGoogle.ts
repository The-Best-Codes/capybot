import { Type, type GenerateContentParameters } from "@google/genai";
import { genAI } from "../../../clients/googleAi";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function searchGoogleFn({ prompt }: { prompt: string }): Promise<{
  success: boolean;
  analysis?: string;
  message?: string;
  error?: any;
}> {
  try {
    const groundingTool = {
      googleSearch: {},
    };

    const config = {
      tools: [groundingTool],
    };

    const request: GenerateContentParameters = {
      model: process.env.GEMINI_SEARCH_MODEL || "gemini-2.0-flash",
      contents: [{ parts: [{ text: prompt }] }],
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
    logger.error("Google search failed:", error);
    return {
      success: false,
      message: "Failed to search Google",
      error,
    };
  }
}

export const searchGoogle: ToolDefinition = {
  name: "search_google",
  description: "Searches Google for information using natural language.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description:
          "A detailed prompt describing what information to search for on Google. Be specific about the type of analysis required (e.g., in-depth analysis, general outline, key points, basic summary). This should be provided by you, the model, and not the user unless they specifically request it.",
      },
    },
    required: ["prompt"],
  },
  function: searchGoogleFn,
};
