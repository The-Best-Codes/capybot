import { tool } from "ai";
import type { Guild } from "discord.js";
import { z } from "zod";
import { getMessage } from "./serverLookup/getMessage";

export const createGetServerMessageTool = (guild: Guild | null) =>
  tool({
    description:
      "Get detailed information about a message by message ID. Provide channelId whenever possible for faster lookup.",
    inputSchema: z.object({
      messageId: z.string().describe("The message ID to fetch"),
      channelId: z
        .string()
        .optional()
        .describe("The channel ID containing the message. Strongly recommended for faster lookup."),
    }),
    execute: async ({ messageId, channelId }) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server (guild)",
        };
      }

      try {
        const { message, warning } = await getMessage({ guild, messageId, channelId });

        if (!message) {
          return {
            success: false,
            error: `Message with ID '${messageId}' not found`,
            warning,
          };
        }

        return {
          success: true,
          result: message,
          warning,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });
