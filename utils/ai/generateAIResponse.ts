import type { Content } from "@google/genai";
import { DynamicRetrievalConfigMode } from "@google/genai";
import { genAI } from "../../clients/googleAi";
import { systemInstruction } from "./systemInstruction";
import { tools } from "./tools";
import { logger } from "../logger";

const MAX_TOOL_CALL_STEPS = 5;

async function executeTool(
  toolName: string | undefined,
  args: any,
): Promise<any> {
  if (!toolName) {
    throw new Error("Tool name is required");
  }
  if (!(toolName in tools)) {
    throw new Error(
      `Tool "${toolName}" not found. Available tools: [${Object.keys(tools).join(", ")}]`,
    );
  }

  const tool = tools[toolName];
  return await tool.function(args);
}

export async function generateAIResponse({
  conversationHistory,
  discordAppId,
  modelName = process.env.GEMINI_AI_MODEL || "gemini-2.0-flash-001",
}: {
  conversationHistory: Content[];
  discordAppId: string;
  modelName?: string;
}) {
  let currentHistory = [...conversationHistory];
  let steps = 0;
  let finalResponse = "";

  while (steps < MAX_TOOL_CALL_STEPS) {
    steps++;
    logger.verbose(`Tool calling step ${steps}/${MAX_TOOL_CALL_STEPS}`);

    const geminiModels = genAI.models;

    const functionDeclarations = Object.values(tools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const response = await geminiModels.generateContent({
      model: modelName,
      contents: currentHistory,
      config: {
        systemInstruction: systemInstruction(discordAppId),
        tools: [{ functionDeclarations }],
      },
    });

    const aiResponse = response.candidates?.[0]?.content;
    if (!aiResponse || !aiResponse.parts || aiResponse.parts.length === 0) {
      console.log("No response parts from AI");
      return "No response from AI";
    }

    const aiPart = aiResponse.parts[0];

    if (aiPart.functionCall) {
      const functionCall = aiPart.functionCall;
      logger.verbose(`AI requested function call: ${functionCall.name}`);

      try {
        const toolResult = await executeTool(
          functionCall.name,
          functionCall.args,
        );
        logger.verbose(`Tool execution successful:`, toolResult);

        currentHistory.push({
          role: "model",
          parts: [{ functionCall }],
        });

        currentHistory.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: { result: toolResult },
              },
            },
          ],
        });
      } catch (error: any) {
        logger.error(`Error executing tool ${functionCall.name}:`, error);
        finalResponse = `Error executing tool ${functionCall.name}: ${error.message}`;
        break;
      }
    } else if (aiPart.text) {
      logger.verbose("AI returned text response (no function call)");
      finalResponse = aiPart.text;
      break;
    } else {
      logger.verbose("AI response contained neither text nor function call");
      finalResponse = "Invalid AI response format";
      break;
    }
  }

  if (steps >= MAX_TOOL_CALL_STEPS && !finalResponse) {
    finalResponse =
      "Reached maximum tool call steps. Could not complete the request.";
  }

  return finalResponse || "No response";
}
