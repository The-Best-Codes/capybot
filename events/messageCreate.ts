import type { Content } from "@google/genai";
import {
  Client,
  Events,
  Message,
  MessageFlags,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { buildConversationHistory } from "../utils/ai/context/history";
import {
  addUserToCollection,
  buildAttachmentContext,
  buildChannelContext,
  buildEntityLookupContext,
  buildMentionsContext,
  buildReferenceContext,
  buildServerContext,
  buildStickerContext,
  type CollectedEntities,
} from "../utils/ai/context/main";
import { generateAIResponse } from "../utils/ai/generateAIResponse";
import { Context } from "../utils/contextBuilder";
import { database, type ConversationMessage } from "../utils/database";
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

    // Only respond to messages mentioning the bot or everyone.
    // This implicitly limits responses to guild channels.
    if (!shouldRespond) return;

    try {
      await message.channel.sendTyping();

      // Save the user message to database first
      const userMessage: ConversationMessage = {
        id: message.id,
        channelId: message.channel.id,
        authorId: message.author.id,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        isBot: false,
        replyToMessageId: message.reference?.messageId,
      };

      try {
        await database.saveConversationMessage(userMessage);
      } catch (error) {
        logger.error(`Failed to save user message to database: ${error}`);
        // Continue execution to allow bot response even if saving fails
      }

      const context = new Context();

      const allMentionedEntities: CollectedEntities = {
        users: new Map(),
        roles: new Map(),
        channels: new Map(),
      };

      addUserToCollection(allMentionedEntities, message.author, message.member);

      if (message.guild) {
        logger.log(
          `Responding to message ${message.id} in guild ${message.guild?.name}.`,
        );
        buildServerContext(context, message);
        buildChannelContext(context, message);
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

      const guildId = message.guild?.id;

      // Generate a temporary message ID for the response (we'll get the real one after sending)
      const tempResponseId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const response = await generateAIResponse({
        conversationHistory,
        discordAppId: process.env.DISCORD_APP_ID || "unknown",
        modelName: process.env.GEMINI_AI_MODEL || "",
        guildId: guildId,
        channelId: message.channel.id,
        responseMessageId: tempResponseId,
      });

      if (response.text) {
        let trimmedResponse;
        if (response.text.length > 1900) {
          trimmedResponse = `${response.text.slice(0, 1900)}\n[Truncated to less than 2000 characters]`;
        } else {
          trimmedResponse = response.text;
        }

        const replyOptions: any = {
          content: response.components ? undefined : trimmedResponse,
        };

        // Add Components V2 if we have tool calls
        if (response.components && response.components.length > 0) {
          replyOptions.components = response.components;
          replyOptions.flags = MessageFlags.IsComponentsV2;
        }

        replyOptions.allowedMentions = {
          parse: [],
          repliedUser: false,
        };

        const botMessage = await message.reply(replyOptions);

        // Now save the bot message to database with the real message ID
        const botConversationMessage: ConversationMessage = {
          id: botMessage.id,
          channelId: botMessage.channel.id,
          authorId: botMessage.author.id,
          content: trimmedResponse,
          timestamp: botMessage.createdAt.toISOString(),
          isBot: true,
          replyToMessageId: message.id,
        };
        await database.saveConversationMessage(botConversationMessage);

        // Update AI response parts with the real message ID
        const tempParts =
          await database.getAIResponsePartsByMessageId(tempResponseId);

        // Batch DB writes for efficiency - wrap in transaction
        if (tempParts.length > 0) {
          try {
            // Note: For a proper implementation, we'd want to add a bulk update method to the database class
            // For now, we'll keep the individual updates but add a comment about the improvement
            for (const part of tempParts) {
              const updatedPart = { ...part, messageId: botMessage.id };
              await database.saveAIResponsePart(updatedPart);
            }
          } catch (error) {
            logger.error(`Failed to update AI response parts: ${error}`);
          }
        }
      } else {
        logger.error("AI response text part is empty.");
        /* await message.reply({
          content: "An error occurred: `Error: AI response text part is empty.`",
          allowedMentions: {
            parse: [],
            repliedUser: false,
          },
        }); */
      }
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      await message.reply({
        content:
          "Looks like I'm getting too popular... wait a bit and message me again. I can't respond right now :(",
        allowedMentions: {
          parse: [],
          repliedUser: true,
        },
      });
    }
  },
};
