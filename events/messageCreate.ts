import { generateText } from "ai";
import {
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { globalModel } from "../clients/ai";
import { systemInstructions } from "../utils/ai/systemPrompt";
import { logger } from "../utils/logger";

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return;
    try {
      const { text } = await generateText({
        model: globalModel,
        prompt: message.content,
        system: systemInstructions,
      });
      await message.reply(text);
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
    }
  },
};
