import { tool } from "ai";
import type { Guild, TextBasedChannel } from "discord.js";
import { z } from "zod";
import { listChannels } from "./listChannels";
import { searchMessages } from "./searchMessages";
import { searchUsers } from "./searchUsers";

const OracleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("searchMessages"),
    query: z
      .string()
      .optional()
      .describe(
        "Fuzzy search query for message content, author username, or display name. If empty, returns latest messages. Optional.",
      ),
    channelId: z.string().optional().describe("Limit search to a specific channel ID. Optional."),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe("Number of results (1-100, default 10)"),
  }),
  z.object({
    action: z.literal("listChannels"),
    query: z.string().optional().describe("Fuzzy search query for channel names/topics. Optional."),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe("Number of results (1-100, default 100)"),
  }),
  z.object({
    action: z.literal("searchUsers"),
    query: z
      .string()
      .optional()
      .describe("Fuzzy search query for username, display name, nickname, or roles. Optional."),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe("Number of results (1-100, default 100)"),
  }),
]);

export const createOracleTool = (channel: TextBasedChannel, guild: Guild | null) =>
  tool({
    description: `The Great Oracle! Search and discover information in the current Discord server.

Actions:
- searchMessages: Get messages across channels with optional fuzzy search (returns latest if no query)
- listChannels: List all channels with optional fuzzy search
- searchUsers: List all users with optional fuzzy search

All actions support fuzzy matching and return results sorted by relevance.`,
    inputSchema: OracleActionSchema,
    execute: async (input) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server (guild)",
        };
      }

      try {
        switch (input.action) {
          case "searchMessages": {
            const results = await searchMessages({
              guild,
              query: input.query,
              channelId: input.channelId,
              limit: input.limit,
            });
            return {
              success: true,
              action: "searchMessages",
              count: results.length,
              results: results.map((r) => ({
                ...r.message,
                relevanceScore: r.score,
              })),
            };
          }

          case "listChannels": {
            const results = await listChannels({
              guild,
              query: input.query,
              limit: input.limit,
            });
            return {
              success: true,
              action: "listChannels",
              count: results.length,
              results: results.map((r) => ({
                ...r.channel,
                relevanceScore: r.score,
              })),
            };
          }

          case "searchUsers": {
            const results = await searchUsers({
              guild,
              query: input.query,
              limit: input.limit,
            });
            return {
              success: true,
              action: "searchUsers",
              count: results.length,
              results: results.map((r) => ({
                ...r.user,
                relevanceScore: r.score,
              })),
            };
          }
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });
