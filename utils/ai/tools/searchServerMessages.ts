import { tool } from "ai";
import type { Guild } from "discord.js";
import { z } from "zod";
import { searchMessages } from "./serverLookup/searchMessages";

export const createSearchServerMessagesTool = (guild: Guild | null) =>
  tool({
    description:
      "Search recent server messages by content or author. Optionally limit the search to a specific channel ID.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          "Plain text fuzzy search query. If omitted, returns recent messages instead of searching.",
        ),
      channelId: z
        .string()
        .optional()
        .describe("Optional channel ID to limit the search to a single channel."),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (1-100, default 10)"),
    }),
    execute: async ({ query, channelId, limit }) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server (guild)",
        };
      }

      try {
        const messageResult = await searchMessages({ guild, query, channelId, limit });

        return {
          success: true,
          count: messageResult.results.length,
          totalSearched: messageResult.totalSearched,
          truncated: messageResult.truncated,
          warning: messageResult.warning,
          results: messageResult.results.map((result) => ({
            ...result.message,
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
