import { Type } from "@google/genai";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

export const addReaction: ToolDefinition = {
  name: "add_reaction",
  description: "Adds a reaction or reactions to a specific message",
  parameters: {
    type: Type.OBJECT,
    properties: {
      messageId: {
        type: Type.STRING,
        description: "The ID of the message to add the reaction to",
      },
      emoji: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description:
          "The emoji(s) to react with. Can be standard emojis or custom emoji IDs. If you are using a single emoji, you should still provide it in an array.",
      },
    },
    required: ["messageId", "emoji"],
  },
  function: async (args: {
    channelId: string;
    messageId: string;
    emoji: string[];
  }) => {
    try {
      const channel = await client.channels.fetch(args.channelId);

      if (!channel?.isTextBased()) {
        return {
          success: false,
          message: "Channel not found or is not a text channel.",
        };
      }

      const message = await channel.messages.fetch(args.messageId);

      if (!message) {
        return { success: false, message: "Message not found." };
      }

      for (const emoji of args.emoji) {
        await message.react(emoji);
      }

      return { success: true, message: "Reaction(s) added successfully." };
    } catch (error) {
      return {
        success: false,
        message: "Failed to add reaction(s).",
        error,
      };
    }
  },
};
