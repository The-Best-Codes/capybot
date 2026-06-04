import { tool } from "ai";
import type { Guild } from "discord.js";
import { z } from "zod";
import { searchUsers } from "./serverLookup/searchUsers";

export const createSearchServerUsersTool = (guild: Guild | null) =>
  tool({
    description:
      "Search server members by username, display name, nickname, or roles. Use this to find a user ID before calling getServerUser.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          "Plain text fuzzy search query. If omitted, returns members sorted by display name.",
        ),
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
        const userResult = await searchUsers({ guild, query, limit });

        return {
          success: true,
          count: userResult.results.length,
          totalMembers: userResult.totalMembers,
          truncated: userResult.truncated,
          warning: userResult.warning,
          results: userResult.results.map((result) => ({
            ...result.user,
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
