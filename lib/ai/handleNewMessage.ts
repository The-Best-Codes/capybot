import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function handleNewMessage(
  message: OmitPartialGroupDMChannel<Message>,
): Promise<string> {
  const response = await generateText({
    model: google(process.env.GEMINI_AI_MODEL || "gemini-2.0-flash"),
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: message.content },
    ],
  });

  return response.text;
}
