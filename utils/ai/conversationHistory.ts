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
      if (msg.author.id === client.user?.id) {
        conversationHistory.push({
          role: "model",
          parts: [{ text: msg?.content || "Error: No message content" }],
        });
      } else {
        const historyContext = new Context();

        const userAttrs = historyContext
          .add("user_attributes")
          .desc("Details about the user who sent this message.");
        userAttrs.add("id", msg.author.id);
        userAttrs.add("name", msg.author.username);
        userAttrs.add("avatar_url", msg.author.avatarURL() || "");
        if (msg.member?.nickname) {
          userAttrs.add("server_nickname", msg.member?.nickname);
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
