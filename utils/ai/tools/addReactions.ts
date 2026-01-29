import { tool } from "ai";
import type { TextBasedChannel } from "discord.js";
import { z } from "zod";

export const createAddReactionsTool = (channel: TextBasedChannel) =>
  tool({
    description: "Add emoji reactions to a message in the channel. Accepts 1-5 reactions.",
    inputSchema: z.object({
      messageId: z.string().describe("The ID of the message to add reactions to"),
      reactions: z
        .array(z.string().describe("Emoji to react with (unicode or Discord emoji format)"))
        .min(1)
        .max(5)
        .describe("Array of 1-5 emojis to add as reactions to the message"),
    }),
    execute: async ({ messageId, reactions }) => {
      try {
        const message = await channel.messages.fetch(messageId);
        for (const reaction of reactions) {
          await message.react(reaction);
        }
        return {
          success: true,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
