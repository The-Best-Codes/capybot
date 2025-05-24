import { Client, Message, TextChannel } from "discord.js";
import { Context } from "../../contextBuilder";
import { logger } from "../../logger";
import {
  addChannelToCollection,
  addRoleToCollection,
  addUserToCollection,
  buildAttachmentContext,
  type CollectedEntities,
  buildStickerContext,
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
    const messages = await message.channel.messages.fetch({ limit: 50 });
    const history = Array.from(messages.values())
      .filter((msg) => msg.id !== message.id)
      .reverse();

    let lastMarkerIndex = -1;
    let currentIndex = 0;
    while (currentIndex < history.length) {
      const nextMarkerIndex = history.findIndex(
        (msg, index) =>
          index >= currentIndex && msg.content.includes(clearHistoryMarker),
      );
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

      historyContext.add("message-timestamp", msg.createdAt.toISOString());
      historyContext.add("message-id", msg.id);

      addUserToCollection(allMentionedEntities, msg.author, msg.member);

      if (msg.author.id === client.user?.id) {
        conversationHistory.push({
          role: "model",
          parts: [{ text: msg?.content || "Error: No message content" }],
        });
      } else {
        historyContext.add("user-id", msg.author.id);
        const member = msg.guild?.members.cache.get(msg.author.id);
        const name = member?.nickname || msg.author.displayName;
        historyContext.add("user-name", name);

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

        let messageContent = msg.content;
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
