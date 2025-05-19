import type { Content, Part } from "@google/genai";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { buildConversationHistory } from "../utils/ai/context/history";
import {
  buildChannelContext,
  buildMentionsContext,
  buildReplyContext,
  buildServerContext,
  buildUserContext,
} from "../utils/ai/context/main";
import { generateAIResponse } from "../utils/ai/generateAIResponse";
import { buildImageParts } from "../utils/ai/imageParts";
import { Context } from "../utils/contextBuilder";
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

    if (!shouldRespond) return;

    try {
      await message.channel.sendTyping();

      const context = new Context();
      buildServerContext(context, message);
      buildChannelContext(context, message);
      await buildReplyContext(context, message);
      buildMentionsContext(context, message);

      const conversationHistory: Content[] = await buildConversationHistory(
        client,
        message,
      );

      const imageParts: Part[] = await buildImageParts(message);

      context.add("message-timestamp", message.createdAt.toISOString());

      const currentMessageParts = [
        {
          text: `${context.toString()}\n\n${message?.content || "Error: No message content"}`,
        },
        ...imageParts,
      ];

      conversationHistory.push({
        role: "user",
        parts: currentMessageParts,
      });

      logger.log(`Responding to message ${message.id}.`);

      const response = await generateAIResponse({
        conversationHistory,
        discordAppId: process.env.DISCORD_APP_ID || "unknown",
      });

      const responseText = response.text;

      if (responseText) {
        let trimmedResponse;
        if (responseText.length > 1900) {
          trimmedResponse = `${responseText.slice(0, 1900)}\n[Truncated to less than 2000 characters]`;
        } else {
          trimmedResponse = responseText;
        }

        const row = new ActionRowBuilder<ButtonBuilder>();

        if (
          response.candidates &&
          response.candidates[0]?.groundingMetadata?.groundingSupports &&
          response.candidates[0]?.groundingMetadata?.groundingSupports?.length >
            0
        ) {
          const numSites =
            response.candidates[0].groundingMetadata.groundingSupports.length;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`web_searches_${message.id}`)
              .setStyle(ButtonStyle.Secondary)
              .setLabel(
                `Searched ${numSites || "a few"} website${numSites === 1 ? "" : "s"}.`,
              )
              .setDisabled(true)
              .setEmoji("🔍"),
          );
        }

        await message.reply({
          content: `${trimmedResponse}`,
          components: row.components.length > 0 ? [row] : [],
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
