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

    if (!result.candidates || result.candidates.length === 0) {
      return {
        success: false,
        message: "No response from the AI model.",
      };
    }

    const parts = result.candidates[0].content?.parts;

    if (!parts || parts.length === 0) {
      return {
        success: false,
        message: "No content parts in the response.",
      };
    }

    let responseText = "";
    for (const part of parts) {
      if (part.text) {
        responseText += part.text;
      }
      if (part.executableCode) {
        responseText += `\nCode: ${part.executableCode.code}\nLanguage: ${part.executableCode.language}`;
      }
      if (part.codeExecutionResult) {
        responseText += `\nExecution Outcome: ${part.codeExecutionResult.outcome}\nOutput: ${part.codeExecutionResult.output}`;
      }
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
