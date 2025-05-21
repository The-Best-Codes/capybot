import {
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { handleNewMessage } from "../lib/ai/handleNewMessage";
import { logger } from "../utils/logger";

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
      await message.channel.sendTyping();

      const aiResponse = await handleNewMessage(message);

      await message.reply(aiResponse);
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      await message.reply(
        "Oh no! Something went wrong when I tried to respond to you.",
      );
    }
  },
};
