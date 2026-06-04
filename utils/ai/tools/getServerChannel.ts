import { tool } from "ai";
import type { Guild } from "discord.js";
import { z } from "zod";
import { getChannel } from "./serverLookup/getChannel";

export const createGetServerChannelTool = (guild: Guild | null) =>
  tool({
    description:
      "Get detailed information about a server channel by channel ID, including topic, permission overwrites, and thread or voice details.",
    inputSchema: z.object({
      channelId: z.string().describe("The channel ID of the server channel to inspect"),
    }),
    execute: async ({ channelId }) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server (guild)",
        };
      }

      try {
        const channel = await getChannel({ guild, channelId });

        if (!channel) {
          return {
            success: false,
            error: `Channel with ID '${channelId}' not found`,
          };
        }

        return {
          success: true,
          result: channel,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });
