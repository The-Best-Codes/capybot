import type { Content } from "@google/genai";
import { DynamicRetrievalConfigMode, GoogleGenAI } from "@google/genai";
import { systemInstruction } from "./systemInstruction";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
