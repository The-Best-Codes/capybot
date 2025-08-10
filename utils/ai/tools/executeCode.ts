import { Type, type GenerateContentParameters } from "@google/genai";
import { genAI } from "../../../clients/googleAi";
import { logger } from "../../logger";
import type { ToolDefinition } from "./types";

async function executeCodeFn({ prompt }: { prompt: string }): Promise<{
  success: boolean;
  analysis?: string;
  message?: string;
  error?: any;
}> {
  try {
    const codeTool = {
      codeExecution: {},
    };

    const config = {
      tools: [codeTool],
    };

    const request: GenerateContentParameters = {
      model: process.env.GEMINI_CODE_EXECUTION_MODEL || "gemini-2.0-flash",
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
    logger.error("Code execution failed:", error);
    return {
      success: false,
      message: "Failed to execute code",
      error,
    };
  }
}

export const executeCode: ToolDefinition = {
  name: "execute_code",
  description:
    "Executes code using natural language. This tool will convert your natural language prompts to Python and execute them, summarizing the result.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description:
          'A detailed prompt describing what code to execute. Example: "Execute this code: [code]" or "Solve this problem using code: [code]". Be specific about the type of analysis of the output required (e.g., in-depth analysis, general outline, key points, basic summary, verbatim). This should be provided by you, the model, and not the user unless they specifically request it.',
      },
    },
    required: ["prompt"],
  },
  function: executeCodeFn,
};
