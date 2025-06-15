import { Client, Message, TextChannel } from "discord.js";
import { Context } from "../../contextBuilder";
import { database, type ConversationMessage } from "../../database";
import { logger } from "../../logger";
import {
  addChannelToCollection,
  addRoleToCollection,
  addUserToCollection,
  buildAttachmentContext,
  buildStickerContext,
  type CollectedEntities,
} from "./main";

export async function buildConversationHistory(
  client: Client,
  message: Message,
  allMentionedEntities: CollectedEntities,
  clearHistoryMarker: string = "{% clear_history_before %}",
): Promise<Array<{ role: string; parts: Array<{ text: string }> }>> {
  const conversationHistory = [];
  let historyStartIndex = 0;

  if (message.channel instanceof TextChannel) {
    // First, try to get conversation history from database
    const dbMessages = await database.getConversationMessagesByChannel(
      message.channel.id,
      50,
    );

    // Also fetch recent Discord messages for comparison and to catch any missed messages
    const messages = await message.channel.messages.fetch({ limit: 50 });
    const discordHistory = Array.from(messages.values())
      .filter((msg) => msg.id !== message.id)
      .reverse();

    // Merge database and Discord messages, preferring database data when available
    const mergedHistory: Array<Message | ConversationMessage> = [];
    const dbMessageIds = new Set(dbMessages.map((msg) => msg.id));

    // Add Discord messages that aren't in database
    for (const discordMsg of discordHistory) {
      if (!dbMessageIds.has(discordMsg.id)) {
        mergedHistory.push(discordMsg);
      }
    }

    // Add database messages
    mergedHistory.push(...dbMessages);

    // Sort by timestamp
    mergedHistory.sort((a, b) => {
      const aTime =
        "createdAt" in a
          ? a.createdAt.getTime()
          : new Date(a.timestamp).getTime();
      const bTime =
        "createdAt" in b
          ? b.createdAt.getTime()
          : new Date(b.timestamp).getTime();
      return aTime - bTime;
    });

    const history = mergedHistory;

    let lastMarkerIndex = -1;
    let currentIndex = 0;
    while (currentIndex < history.length) {
      const nextMarkerIndex = history.findIndex((msg, index) => {
        if (index < currentIndex) return false;
        const content =
          "content" in msg ? msg.content : (msg as ConversationMessage).content;
        return content.includes(clearHistoryMarker);
      });
      if (nextMarkerIndex !== -1) {
        lastMarkerIndex = nextMarkerIndex;
        currentIndex = nextMarkerIndex + 1;
      } else {
        break;
      }
    }

    if (lastMarkerIndex !== -1) {
      historyStartIndex = lastMarkerIndex + 1;
    }

    for (let i = historyStartIndex; i < history.length; i++) {
      const msg = history[i];
      const historyContext = new Context();

      // Handle both Discord Message and ConversationMessage types
      const msgId =
        "createdAt" in msg ? msg.id : (msg as ConversationMessage).id;
      const msgContent =
        "createdAt" in msg ? msg.content : (msg as ConversationMessage).content;
      const msgTimestamp =
        "createdAt" in msg
          ? msg.createdAt.toISOString()
          : (msg as ConversationMessage).timestamp;
      const msgAuthor =
        "createdAt" in msg
          ? msg.author
          : { id: (msg as ConversationMessage).authorId };
      const isBot =
        "createdAt" in msg
          ? msg.author.bot
          : (msg as ConversationMessage).isBot;

      historyContext.add("message-timestamp", msgTimestamp);
      historyContext.add("message-id", msgId);

      // Add user to collection
      if ("createdAt" in msg) {
        addUserToCollection(allMentionedEntities, msg.author, msg.member);
      } else {
        // For database messages, we need to reconstruct user info
        const dbMsg = msg as ConversationMessage;
        addUserToCollection(allMentionedEntities, {
          id: dbMsg.authorId,
          name: "Unknown User", // We could store more user info in the database
          isBot: dbMsg.isBot,
        });
      }

      if (isBot && msgAuthor.id === client.user?.id) {
        // This is a bot message - check for stored AI response parts
        const aiParts = await database.getAIResponsePartsByMessageId(msgId);
        let responseText = msgContent || "No text content in message";

        if (aiParts.length > 0) {
          // Build response from stored parts
          const textParts = aiParts.filter((part) => part.type === "text");
          const toolCalls = aiParts.filter((part) => part.type === "tool_call");

          if (textParts.length > 0) {
            responseText = textParts.map((part) => part.content).join("\n");
          }

          // Add tool call information to context
          if (toolCalls.length > 0) {
            const toolContext = historyContext.add("tool-calls-used");
            toolCalls.forEach((toolCall, index) => {
              const toolInfo = toolContext.add(`tool-${index}`);
              toolInfo.add("name", toolCall.toolName || "unknown");
              if (toolCall.toolArgs) {
                toolInfo.add("args", JSON.stringify(toolCall.toolArgs));
              }
            });
          }
        }

        conversationHistory.push({
          role: "model",
          parts: [{ text: responseText }],
        });
      } else {
        // This is a user message
        historyContext.add("user-id", msgAuthor.id);

        if ("createdAt" in msg) {
          // Discord message - full processing
          const member = msg.guild?.members.cache.get(msg.author.id);
          const name = member?.nickname || msg.author.displayName;
          historyContext.add("user-name", name);

          // Process mentions
          msg.mentions.users.forEach((user) =>
            addUserToCollection(
              allMentionedEntities,
              user,
              msg.guild?.members.cache.get(user.id),
            ),
          );
          msg.mentions.roles.forEach((role) =>
            addRoleToCollection(allMentionedEntities, role),
          );
          msg.mentions.channels.forEach((channel) => {
            addChannelToCollection(allMentionedEntities, channel);
          });

          // Handle reply context
          if (msg.reference?.messageId) {
            try {
              const referencedMsg = await msg.fetchReference();
              addUserToCollection(
                allMentionedEntities,
                referencedMsg.author,
                referencedMsg.member,
              );

              referencedMsg.mentions.users.forEach((user) =>
                addUserToCollection(
                  allMentionedEntities,
                  user,
                  referencedMsg.guild?.members.cache.get(user.id),
                ),
              );
              referencedMsg.mentions.roles.forEach((role) =>
                addRoleToCollection(allMentionedEntities, role),
              );
              referencedMsg.mentions.channels.forEach((channel) => {
                addChannelToCollection(allMentionedEntities, channel);
              });

              historyContext.add("reply-to-message-id", referencedMsg.id);
              historyContext.add("reply-to-user-id", referencedMsg.author.id);

              // Add reply content for better context
              const replyContent = referencedMsg.content || "[No text content]";
              historyContext.add(
                "reply-to-content",
                replyContent.slice(0, 200),
              ); // Limit length
            } catch (err) {
              logger.warn(
                `Could not fetch referenced message ${msg.reference.messageId} for history message ${msg.id}: ${err}`,
              );
            }
          }

          buildAttachmentContext(
            historyContext,
            msg,
            "Details about attachments in the historical message",
          );
          buildStickerContext(historyContext, msg);
        } else {
          // Database message - limited processing
          const dbMsg = msg as ConversationMessage;
          if (dbMsg.replyToMessageId) {
            historyContext.add("reply-to-message-id", dbMsg.replyToMessageId);

            // Try to get reply context from database or Discord
            const replyMsg = await database.getConversationMessage(
              dbMsg.replyToMessageId,
            );
            if (replyMsg) {
              historyContext.add("reply-to-user-id", replyMsg.authorId);
              historyContext.add(
                "reply-to-content",
                replyMsg.content.slice(0, 200),
              );
            }
          }
        }

        let messageContent = msgContent;
        if (!messageContent) {
          historyContext
            .add("no-content", "true")
            .desc(
              "The message contains no text content, so focus on attachments and stickers if present.",
            );
        }

        conversationHistory.push({
          role: "user",
          parts: [
            {
              text: `${historyContext.toString()}\n\n${messageContent}`,
            },
          ],
        });
      }
    }
  }

  return conversationHistory;
}
