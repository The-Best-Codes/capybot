import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { buildChannelHistory } from "../../utils/ai/channelHistoryBuilder";

export async function handleNewMessage(
  message: OmitPartialGroupDMChannel<Message>,
): Promise<string> {
  const channelMessageHistory = await buildChannelHistory(message.channel, 10);

  const messages: any[] = [
    { role: "system", content: "You are a helpful assistant." },
    ...channelMessageHistory,
    { role: "user", content: message.content },
  ];

  const response = await generateText({
    model: google(process.env.GEMINI_AI_MODEL || "gemini-2.0-flash"),
    messages,
  });

  return response.text;
}
