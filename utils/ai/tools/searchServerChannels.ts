import { tool } from "ai";
import type { Guild } from "discord.js";
import { z } from "zod";
import { listChannels } from "./serverLookup/listChannels";

export const createSearchServerChannelsTool = (guild: Guild | null) =>
  tool({
    description:
      "List or search server channels by name or topic. Use this to find channel IDs before calling getServerChannel or searchServerMessages.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Plain text fuzzy search query. If omitted, returns channels in server order."),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (1-100, default 100)"),
    }),
    execute: async ({ query, limit }) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server (guild)",
        };
      }

      try {
        const channelResult = await listChannels({ guild, query, limit });

        return {
          success: true,
          count: channelResult.results.length,
          totalChannels: channelResult.totalChannels,
          truncated: channelResult.truncated,
          results: channelResult.results.map((result) => ({
            ...result.channel,
            relevanceScore: result.score === -1 ? null : result.score,
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });
