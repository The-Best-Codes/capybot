import { Client, Message, TextChannel } from "discord.js";
import { Context } from "../../contextBuilder";
import {
  buildMentionsContext,
  buildReplyContext,
  buildUserContext,
} from "./main";

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

      buildMentionsContext(historyContext, msg);
      await buildReplyContext(historyContext, msg);

      historyContext.add("message-timestamp", msg.createdAt.toISOString());

      if (msg.author.id === client.user?.id) {
        conversationHistory.push({
          role: "model",
          parts: [{ text: msg?.content || "Error: No message content" }],
        });
      } else {
        buildUserContext(historyContext, msg);

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
