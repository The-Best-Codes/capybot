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
import {
  buildChannelContext,
  buildServerContext,
  buildUserContext,
} from "../utils/ai/clientContextBuilders";
import { buildConversationHistory } from "../utils/ai/conversationHistory";
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

    const shouldRandomlyRespond = Math.random() < 0.1;
    const shouldRespond =
      shouldRandomlyRespond ||
      message.mentions.users.has(client.user?.id || "");

    if (!shouldRespond) return;

    try {
      await message.channel.sendTyping();

      const context = new Context();
      buildServerContext(context, message);
      buildChannelContext(context, message);

      const conversationHistory: Content[] = await buildConversationHistory(
        client,
        message,
      );

      const imageParts: Part[] = await buildImageParts(message);

      context.add("current_time_utc", new Date().toISOString());
      buildUserContext(context, message);

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

      logger.log(
        `Responding to message ${message.id}. This is a response triggered ${shouldRandomlyRespond && !message.mentions.users.has(client.user?.id || "") ? "randomly" : "due to a ping"}.
There are ${conversationHistory.length} messages in the conversation history.`,
      );

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
          shouldRandomlyRespond &&
          !message.mentions.users.has(client.user?.id || "")
        ) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`thumbsup_${message.id}`)
              .setStyle(ButtonStyle.Success)
              .setEmoji("👍"),
            new ButtonBuilder()
              .setCustomId(`thumbsdown_${message.id}`)
              .setStyle(ButtonStyle.Danger)
              .setEmoji("👎"),
          );
        }

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
