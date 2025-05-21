import type { CoreMessage } from "ai";
import { Message, type TextBasedChannel } from "discord.js";
import client from "../../clients/discord";

export async function buildChannelHistory(
  channel: TextBasedChannel,
  limit: number = 10,
): Promise<Array<CoreMessage>> {
  try {
    const messages = await channel.messages.fetch({ limit });

    const history = messages
      .filter((message: Message) => message.content)
      .map((message: Message) => ({
        role: message.author.id === client.user?.id ? "assistant" : "user",
        content: message?.content ?? "Error: No message content.",
      }))
      .reverse();

    return history as any;
  } catch (error) {
    console.error("Error fetching message history:", error);
    return [];
  }
}
