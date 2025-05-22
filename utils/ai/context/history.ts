import { Client, Message, TextChannel } from "discord.js"; // Added imports
import { Context } from "../../contextBuilder";
import { logger } from "../../logger"; // Assuming logger is available
// Import helpers from main.ts to add entities to collection
import {
  addChannelToCollection,
  addRoleToCollection,
  addUserToCollection,
  type CollectedEntities,
} from "./main";

export async function buildConversationHistory(
  client: Client,
  message: Message,
  allMentionedEntities: CollectedEntities, // Pass the main collection here
  clearHistoryMarker: string = "{% clear_history_before %}",
): Promise<Array<{ role: string; parts: Array<{ text: string }> }>> {
  // Return only the history array
  const conversationHistory = [];
  let historyStartIndex = 0;

  if (message.channel instanceof TextChannel) {
    // Fetch more messages to ensure history is useful, maybe 100? Adjust limit as needed.
    const messages = await message.channel.messages.fetch({ limit: 100 });
    // Filter out the current message itself before processing history
    const history = Array.from(messages.values())
      .filter((msg) => msg.id !== message.id)
      .reverse();

    // Find the clear history marker (excluding the current message)
    const clearMarkerIndex = history.findIndex((msg) =>
      msg.content.includes(clearHistoryMarker),
    );
    if (clearMarkerIndex !== -1) {
      historyStartIndex = clearMarkerIndex + 1; // Start from the message *after* the marker
    }

    for (let i = historyStartIndex; i < history.length; i++) {
      // Iterate up to the end of the history array (before the current message)
      const msg = history[i];
      const historyContext = new Context();

      // --- Simplified context for history messages ---
      historyContext.add("message-timestamp", msg.createdAt.toISOString());
      historyContext.add("message-id", msg.id); // Add message ID

      // Always add the author of the history message to the main collection
      addUserToCollection(allMentionedEntities, msg.author, msg.member);

      if (msg.author.id === client.user?.id) {
        // Model message - just content
        conversationHistory.push({
          role: "model",
          parts: [{ text: msg?.content || "Error: No message content" }],
        });
      } else {
        // User message - minimal context + content
        historyContext.add("user-id", msg.author.id); // Add user ID
        // Optionally add user name for easier reading, but ID is key for lookup
        const member = msg.guild?.members.cache.get(msg.author.id);
        const name = member?.nickname || msg.author.displayName;
        historyContext.add("user-name", name);

        // Collect mentions from this history message and add to the main collection
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
          // Try to add channel to the collection (name might be missing for partial)
          addChannelToCollection(allMentionedEntities, channel);
        });

        // Collect author of referenced message if it's a reply and add to main collection
        if (msg.reference?.messageId) {
          // We *must* fetch the referenced message to get its author and mentions reliably
          try {
            const referencedMsg = await msg.fetchReference();
            addUserToCollection(
              allMentionedEntities,
              referencedMsg.author,
              referencedMsg.member,
            );

            // Also collect mentions *within* the referenced message for the global pool
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

            // Add referenced message ID to history context (optional, but helpful)
            historyContext.add("reply-to-message-id", referencedMsg.id);
            historyContext.add("reply-to-user-id", referencedMsg.author.id);
          } catch (err) {
            // Log error but continue
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

  return conversationHistory; // Return only the history array
}
