import {
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { logger } from "../utils/logger";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return;

    const mentionsBot = message.mentions.users.has(client.user?.id || "");

    if (!mentionsBot) return;

    try {
      // Show typing indicator while generating response
      await message.channel.sendTyping();

      // Extract the message content, removing the bot mention
      const cleanContent = message.content.replace(/<@!?\d+>/g, "").trim();

      // Generate AI response using Gemini
      const { text } = await generateText({
        model: google(process.env.GEMINI_AI_MODEL || "gemini-2.0-flash"),
        prompt: cleanContent,
      });

      // Reply with the AI-generated response
      await message.reply(text);
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      await message.reply(
        "Oh no! Something went wrong when I tried to respond to you.",
      );
    }
  },
};
