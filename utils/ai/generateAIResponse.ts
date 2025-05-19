import type { Content } from "@google/genai";
import { DynamicRetrievalConfigMode } from "@google/genai";
import { genAI } from "../../clients/googleAi";
import { systemInstruction } from "./systemInstruction";

export async function generateAIResponse({
  conversationHistory,
  discordAppId,
  modelName = process.env.GEMINI_AI_MODEL || "gemini-2.0-flash-001",
}: {
  conversationHistory: Content[];
  discordAppId: string;
  modelName?: string;
}) {
  const geminiModels = genAI.models;

  const response = await geminiModels.generateContent({
    model: modelName,
    contents: conversationHistory,
    config: {
      systemInstruction: systemInstruction(discordAppId),
      tools: [
        {
          googleSearch: {
            dynamicRetrievalConfig: {
              dynamicThreshold: 0.5,
              mode: DynamicRetrievalConfigMode.MODE_DYNAMIC,
            },
          },
        },
      ],
    },
  });

  return response;
}
