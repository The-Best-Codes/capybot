import { tool } from "ai";
import type { Guild, TextBasedChannel } from "discord.js";
import { z } from "zod";

const messageSchema = z.object({
  channelId: z.string().describe("The ID of the channel to send the message to"),
  content: z.string().describe("The content of the message to send"),
  replyToMessageId: z.string().optional().describe("Optional ID of the message to reply to"),
});

export const createSendMessagesTool = (currentChannel: TextBasedChannel, guild: Guild | null) =>
  tool({
    description:
      "Send messages to channels in the current server. Can send multiple messages at once, optionally as replies to specific messages.",
    inputSchema: z.object({
      messages: z.array(messageSchema).min(1).max(10).describe("Array of 1-10 messages to send"),
    }),
    execute: async ({ messages }) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server",
        };
      }

      const results: Array<{
        channelId: string;
        messageId?: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const msg of messages) {
        try {
          const channel = await guild.channels.fetch(msg.channelId);

          if (!channel) {
            results.push({
              channelId: msg.channelId,
              success: false,
              error: "Channel not found",
            });
            continue;
          }

          if (!channel.isTextBased()) {
            results.push({
              channelId: msg.channelId,
              success: false,
              error: "Channel is not a text channel",
            });
            continue;
          }

          const sendOptions: { content: string; reply?: { messageReference: string } } = {
            content: msg.content,
          };

          if (msg.replyToMessageId) {
            sendOptions.reply = { messageReference: msg.replyToMessageId };
          }

          const sentMessage = await channel.send(sendOptions);

          results.push({
            channelId: msg.channelId,
            messageId: sentMessage.id,
            success: true,
          });
        } catch (error) {
          results.push({
            channelId: msg.channelId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const allSucceeded = results.every((r) => r.success);
      return {
        success: allSucceeded,
        results,
      };
    },
  });
