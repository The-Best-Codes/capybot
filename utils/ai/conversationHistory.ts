import { Client, Message, TextChannel } from "discord.js";
import { Context } from "../contextBuilder";

export async function buildConversationHistory(
  client: Client,
  message: Message,
  clearHistoryMarker: string = "{% clear_history_before %}",
) {
  const conversationHistory = [];
  let historyStartIndex = 0;

  if (message.channel instanceof TextChannel) {
    const messages = await message.channel.messages.fetch({ limit: 50 });
    const history = Array.from(messages.values()).reverse();

    for (let i = history.length - 2; i >= 0; i--) {
      const msg = history[i];
      if (msg.content.includes(clearHistoryMarker)) {
        historyStartIndex = i;
        break;
      }
    }

    for (let i = historyStartIndex; i < history.length - 1; i++) {
      const msg = history[i];
      const historyContext = new Context();

      if (msg.reference) {
        historyContext
          .add("is_reply", "true")
          .desc("This message is a reply to another message");
        const replyAttributes = historyContext
          .add("replying_to")
          .desc("Information about the message being replied to");

        try {
          const referencedMessage = await msg.fetchReference();
          replyAttributes.add("message_id", referencedMessage.id);
          replyAttributes.add("content", referencedMessage.content);

          const userAttrs = replyAttributes
            .add("user_attributes")
            .desc(
              "Details about the user who wrote the message being replied to",
            );
          userAttrs.add("id", referencedMessage.author.id);
          userAttrs.add("username", referencedMessage.author.username);
          if (referencedMessage.member?.nickname) {
            userAttrs
              .add("server_nickname", referencedMessage.member?.nickname)
              .desc("The user's prefered name in this server");
          }
          if (referencedMessage.author.bot) {
            userAttrs.add("is_bot", "true");
          }
        } catch (error) {
          replyAttributes.add("error", "Could not fetch referenced message");
        }
      }

      if (msg.author.id === client.user?.id) {
        conversationHistory.push({
          role: "model",
          parts: [{ text: msg?.content || "Error: No message content" }],
        });
      } else {
        const userAttrs = historyContext
          .add("user_attributes")
          .desc("Details about the user who sent this message");
        userAttrs.add("id", msg.author.id);
        userAttrs.add("username", msg.author.username);
        if (msg.member?.nickname) {
          userAttrs
            .add("server_nickname", msg.member?.nickname)
            .desc("The user's prefered name in this server");
        }
        if (msg.author.bot) {
          userAttrs.add("is_bot", "true");
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
