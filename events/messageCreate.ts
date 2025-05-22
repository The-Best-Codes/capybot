import type { Content, Part } from "@google/genai";
import {
  ChannelType,
  Client,
  Events,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { buildConversationHistory } from "../utils/ai/context/history";
import {
  addUserToCollection,
  buildChannelContext,
  buildDMContext,
  buildEntityLookupContext,
  buildMentionsContext,
  buildReplyContext,
  buildServerContext, // Import the helper
  type CollectedEntities, // Import the type
} from "../utils/ai/context/main";
import { generateAIResponse } from "../utils/ai/generateAIResponse";
import { buildImageParts } from "../utils/ai/imageParts";
import { Context } from "../utils/contextBuilder";
import { escapeMentions } from "../utils/escapeMentions";
import { logger } from "../utils/logger";
// @@ REMOVE LATER
import * as fs from "node:fs";
import * as path from "node:path";

const CONTEXT_DIR = path.join(__dirname, "../data/context");
// @@ END REMOVE LATER

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

    if (!shouldRespond && message.channel.type !== ChannelType.DM) return; // Only respond to DMs if not mentioning bot/everyone

    try {
      await message.channel.sendTyping();

      const context = new Context();

      // Initialize the central collection for all entities
      const allMentionedEntities: CollectedEntities = {
        users: new Map(),
        roles: new Map(),
        channels: new Map(),
      };

      // Always add the current message author to the collection first
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

      // Build conversation history, passing the entities collection to be populated
      const conversationHistory: Content[] = await buildConversationHistory(
        client,
        message,
        allMentionedEntities, // Pass the collection here
        "{% clear_history_before %}",
      );

      // Build reply context for the current message, also populating the entities collection
      // This will add the author and mentions of the referenced message to the collection
      await buildReplyContext(context, message, allMentionedEntities); // Pass the collection

      // Build mentions context for the current message, also populating the entities collection
      // This will add entities mentioned in the current message to the collection
      buildMentionsContext(context, message, allMentionedEntities); // Pass the collection

      // Now build the centralized entity lookup table in the main context
      // This uses the collection that was populated by history, reply, and mentions builders
      buildEntityLookupContext(context, allMentionedEntities);

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

      // @@ REMOVE LATER - Save context to file
      if (!fs.existsSync(CONTEXT_DIR)) {
        fs.mkdirSync(CONTEXT_DIR, { recursive: true });
      }
      const contextFilePath = path.join(CONTEXT_DIR, `${message.id}.json`);
      // Save the final context string representation which includes the entity lookup
      fs.writeFileSync(contextFilePath, context.toString());
      logger.log(`Context saved to ${contextFilePath}`);
      // @@ END REMOVE LATER

      const guildId = message.guild?.id;

      const response = await generateAIResponse({
        conversationHistory,
        discordAppId: process.env.DISCORD_APP_ID || "unknown",
        guildId: guildId,
        modelName: process.env.GEMINI_AI_MODEL || "",
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
