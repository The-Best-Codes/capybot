import { Client, Message, TextChannel } from "discord.js";
import { Context } from "../../contextBuilder";
import { logger } from "../../logger";
import {
  addChannelToCollection,
  addRoleToCollection,
  addUserToCollection,
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
    const messages = await message.channel.messages.fetch({ limit: 50 });
    const history = Array.from(messages.values())
      .filter((msg) => msg.id !== message.id)
      .reverse();

    const clearMarkerIndex = history.findIndex((msg) =>
      msg.content.includes(clearHistoryMarker),
    );
    if (clearMarkerIndex !== -1) {
      historyStartIndex = clearMarkerIndex + 1;
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

        conversationHistory.push({
          role: "user",
          parts: [
            {
              text: `${historyContext.toString()}\n\n${msg?.content || "Error: No message content"}`,
            },
          ],
        });
      }
    }
  }

  return conversationHistory;
}
