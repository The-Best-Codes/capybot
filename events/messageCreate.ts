import { generateText, stepCountIs } from "ai";
import {
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { globalModel } from "../clients/ai";
import { buildContext } from "../utils/ai/context";
import { systemInstructions } from "../utils/ai/systemPrompt";
import { createTools } from "../utils/ai/tools";
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
      message.channel.sendTyping();

      const context = await buildContext(message);
      logger.debug(
        `[event:messageCreate] Responding to message ID ${message.id}. Context:`,
        context,
      );

      const prompt = context;
      const tools = createTools(message.channel);

      const { text } = await generateText({
        model: globalModel,
        prompt,
        system: systemInstructions,
        tools,
        stopWhen: stepCountIs(3),
      });

      await message.reply({
        content: text,
        allowedMentions: { repliedUser: false, parse: [] },
      });
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
    }
  },
};
