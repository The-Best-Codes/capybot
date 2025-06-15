import type { Content } from "@google/genai";
import {
  ChannelType,
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import fs from "fs";
import { buildConversationHistory } from "../utils/ai/context/history";
import {
  addUserToCollection,
  buildAttachmentContext,
  buildChannelContext,
  buildDMContext,
  buildEntityLookupContext,
  buildMentionsContext,
  buildReferenceContext,
  buildServerContext,
  buildStickerContext,
  type CollectedEntities,
} from "../utils/ai/context/main";
import { generateAIResponse } from "../utils/ai/generateAIResponse";
import { Context } from "../utils/contextBuilder";
import { escapeMentions } from "../utils/escapeMentions";
import { logger } from "../utils/logger";

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return;

    const mentionsBot = message.mentions.users.has(client.user?.id || "");
    const mentionsEveryone = message.mentions.everyone;
    const shouldRespond = mentionsBot || mentionsEveryone;

    if (!shouldRespond && message.channel.type !== ChannelType.DM) return; // Only respond to DMs and messages mentioning the bot or everyone

    try {
      await message.channel.sendTyping();

      const context = new Context();

      const allMentionedEntities: CollectedEntities = {
        users: new Map(),
        roles: new Map(),
        channels: new Map(),
      };

      addUserToCollection(allMentionedEntities, message.author, message.member);

      if (message.guild) {
        logger.log(
          `Responding to message ${message.id} in guild ${message.guild.name}.`,
        );
        buildServerContext(context, message);
        buildChannelContext(context, message);
      } else {
        buildDMContext(context, message);
        logger.log(
          `Responding to DM ${message.id} from ${message.author.username}. Content: ${message.content}.`,
        );
      }

      const conversationHistory: Content[] = await buildConversationHistory(
        client,
        message,
        allMentionedEntities,
        "{% clear_history_before %}",
      );

      await buildReferenceContext(context, message, allMentionedEntities);
      buildMentionsContext(context, message, allMentionedEntities);
      buildAttachmentContext(context, message);
      buildStickerContext(context, message);
      buildEntityLookupContext(context, allMentionedEntities);

      // Manually add additional context
      context.add("message-timestamp", message.createdAt.toISOString());
      const currentMessageAuthor = context.add("current-message-author");
      currentMessageAuthor.add("id", message.author.id);
      currentMessageAuthor.add(
        "name",
        message.member?.nickname || message.author.displayName,
      );
      context.add("current-message-id", message.id);

      const currentMessageParts = [
        {
          text: `${context.toString()}\n\n${message?.content}`,
        },
      ];

      conversationHistory.push({
        role: "user",
        parts: currentMessageParts,
      });

      // TODO: Debugging, remove this later
      fs.writeFileSync(
        "data/conversationHistory.json",
        JSON.stringify(conversationHistory),
      );

      const guildId = message.guild?.id;

      const response = await generateAIResponse({
        conversationHistory,
        discordAppId: process.env.DISCORD_APP_ID || "unknown",
        modelName: process.env.GEMINI_AI_MODEL || "",
        guildId: guildId,
        channelId: message.channel.id,
      });

      const responseText = response;

      if (responseText) {
        let trimmedResponse;
        if (responseText.length > 1900) {
          trimmedResponse = `${responseText.slice(0, 1900)}\n[Truncated to less than 2000 characters]`;
        } else {
          trimmedResponse = responseText;
        }

        await message.reply({
          content: `${escapeMentions(trimmedResponse)}`,
        });
      } else {
        await message.reply("Oops! The AI didn't respond.");
      }
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      await message.reply(
        "Oh no! Something went wrong when I tried to respond to you.",
      );
    }
  },
};
