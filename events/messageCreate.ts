import type { Content } from "@google/genai";
import {
  Client,
  Events,
  Message,
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
import {
  database,
  type ConversationMessage,
  type IgnoreRule,
} from "../utils/database";
import { logger } from "../utils/logger";

async function shouldIgnoreMessage(
  message: OmitPartialGroupDMChannel<Message<boolean>>,
): Promise<boolean> {
  if (!message.guild) return false; // Only apply in guilds

  const rules: IgnoreRule[] = await database.getIgnoreRulesByGuild(
    message.guild.id,
  );

  for (const rule of rules) {
    if (rule.scope === "server") {
      if (rule.channelId && rule.channelId === message.channel.id) {
        return true; // Ignore channel server-wide
      }
      if (rule.userId && rule.userId === message.author.id) {
        return true; // Ignore user server-wide
      }
    } else if (rule.scope === "channel_specific") {
      if (
        rule.userId === message.author.id &&
        rule.channelId === message.channel.id
      ) {
        return true; // Ignore user in specific channel
      }
    }
  }
  return false;
}

export default {
  event: Events.MessageCreate,
  handler: async (
    client: Client,
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) => {
    if (message.author.bot) return;

    // Check if message should be ignored
    if (await shouldIgnoreMessage(message)) {
      logger.log(`Ignoring message ${message.id} due to ignore rules.`);
      return;
    }

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
    }

    const mentionsBot = message.mentions.users.has(client.user?.id || "");
    const mentionsEveryone = message.mentions.everyone;

    let isReplyToBot = false;
    if (message.reference?.messageId && !mentionsBot) {
      const cachedRef = await database.getConversationMessage(
        message.reference.messageId,
      );
      if (cachedRef && cachedRef.authorId === client.user?.id) {
        isReplyToBot = true;
      } else if (!cachedRef) {
        try {
          const fetchedRef = await message.fetchReference();
          if (fetchedRef.author.id === client.user?.id) isReplyToBot = true;
        } catch (e) {}
      }
    }

    const isDirectInteraction = mentionsBot || mentionsEveryone || isReplyToBot;

    const overhearRate = process.env.AI_OVERHEAR_RATE
      ? parseFloat(process.env.AI_OVERHEAR_RATE)
      : 0.02;
    const isOverhearing = !isDirectInteraction && Math.random() < overhearRate;

    if (!isDirectInteraction && !isOverhearing) {
      return;
    }

    try {
      if (isDirectInteraction) {
        await message.channel.sendTyping();
      }

      const context = new Context();

      const triggerContext = context
        .add("processing-trigger")
        .desc("Indicates why the AI is receiving this message.");

      if (isDirectInteraction) {
        triggerContext
          .add("type", "direct_interaction")
          .desc(
            "User explicitly mentioned you or replied to you. You should respond.",
          );
        logger.log(
          `Processing direct interaction in ${message.guild?.name || "DM"}.`,
        );
      } else {
        triggerContext
          .add("type", "overhearing")
          .desc(
            "You are 'overhearing' this. Only respond if highly relevant/funny. Otherwise use ignore phrase.",
          );
        logger.log(
          `Overhearing message (lucky ${overhearRate * 100}%) in ${message.guild?.name || "DM"}.`,
        );
      }

      const allMentionedEntities: CollectedEntities = {
        users: new Map(),
        roles: new Map(),
        channels: new Map(),
      };

      addUserToCollection(allMentionedEntities, message.author, message.member);

      if (message.guild) {
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
        const ignorePhrase =
          process.env.IGNORE_RESPONSE_PHRASE || "~!IGNORE_RESPONSE~|";

        // Check if AI decided to ignore
        if (response.text.includes(ignorePhrase)) {
          logger.log(
            `AI chose to ignore message (${isDirectInteraction ? "Direct" : "Overheard"}).`,
          );

          // Cleanup any AI response parts created with tempResponseId
          const tempParts =
            await database.getAIResponsePartsByMessageId(tempResponseId);
          if (tempParts.length > 0) {
            try {
              await database.deleteAIResponsePartsByMessageId(tempResponseId);
              logger.log(
                `Successfully cleaned up ${tempParts.length} AI response parts for temporary response ID: ${tempResponseId}`,
              );
            } catch (cleanupError) {
              logger.error(
                `Failed to clean up ${tempParts.length} AI response parts for temporary response ID ${tempResponseId}: ${cleanupError}`,
              );
            }
          }

          return;
        }

        let trimmedResponse;
        if (response.text.length > 1900) {
          trimmedResponse = `${response.text.slice(0, 1900)}\n[Truncated to less than 2000 characters]`;
        } else {
          trimmedResponse = response.text;
        }

        const replyOptions: any = {
          content: trimmedResponse,
        };

        replyOptions.allowedMentions = {
          parse: [],
          repliedUser: false,
        };

        const botMessage = isDirectInteraction
          ? await message.reply(replyOptions)
          : await message.channel.send(replyOptions);

        // Now save the bot message to database with the real message ID
        const botConversationMessage: ConversationMessage = {
          id: botMessage.id,
          channelId: botMessage.channel.id,
          authorId: botMessage.author.id,
          content: trimmedResponse,
          timestamp: botMessage.createdAt.toISOString(),
          isBot: true,
          // Only link reply if we actually used reply()
          replyToMessageId: isDirectInteraction ? message.id : undefined,
        };
        await database.saveConversationMessage(botConversationMessage);

        // Update AI response parts with the real message ID
        const tempParts =
          await database.getAIResponsePartsByMessageId(tempResponseId);

        if (tempParts.length > 0) {
          try {
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
      }
    } catch (error) {
      logger.error(`Error generating AI response: ${error}`);
      if (isDirectInteraction) {
        await message.reply({
          content:
            "Looks like I'm getting too popular... wait a bit and message me again. I can't respond right now :(",
          allowedMentions: { parse: [], repliedUser: true },
        });
      }
    }
  },
};
