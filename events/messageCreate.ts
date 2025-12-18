import { generateText } from "ai";
import {
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { globalModel } from "../clients/ai";
import { systemInstructions } from "../utils/ai/systemPrompt";
import { buildContextXML } from "../utils/ai/buildContext";
import { logger } from "../utils/logger";

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return;

    const botId = client.user!.id;
    const isMentioned = message.mentions.has(botId);

    let isReplyToBot = false;
    if (message.reference !== null) {
      try {
        const repliedToMessage = await message.channel.messages.fetch(
          message.reference.messageId ?? "",
        );
        isReplyToBot = repliedToMessage.author.id === botId;
      } catch (error) {
        isReplyToBot = false;
      }
    }

    if (!isMentioned && !isReplyToBot) return;

    try {
      const context = await buildContextXML(message);
      logger.log("Context XML:", context);

      const prompt = `${context}\n\nUser message: ${message.content}`;

      const { text } = await generateText({
        model: globalModel,
        prompt,
        system: systemInstructions,
      });
      await message.reply(text);
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
    }
  },
};
