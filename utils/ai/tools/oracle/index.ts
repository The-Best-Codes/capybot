import { tool } from "ai";
import type { Guild, TextBasedChannel } from "discord.js";
import { z } from "zod";
import { getChannel } from "./getChannel";
import { getMessage } from "./getMessage";
import { getUser } from "./getUser";
import { listChannels } from "./listChannels";
import { searchMessages } from "./searchMessages";
import { searchUsers } from "./searchUsers";

const OracleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("messages"),
    id: z
      .string()
      .optional()
      .describe(
        "Message ID to get detailed info about. If provided, returns comprehensive details including reactions, embeds, attachments, mentions, and reply info.",
      ),
    query: z
      .string()
      .optional()
      .describe(
        "Fuzzy search query for message content, author username, or display name. Used when 'id' is not provided. If empty, returns latest messages.",
      ),
    channelId: z
      .string()
      .optional()
      .describe("Limit search to a specific channel ID, or specify channel when fetching by ID."),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe("Number of search results (1-100, default 10). Ignored when fetching by ID."),
  }),
  z.object({
    action: z.literal("channels"),
    id: z
      .string()
      .optional()
      .describe(
        "Channel ID to get detailed info about. If provided, returns comprehensive details including permissions, thread metadata, voice settings, and more.",
      ),
    query: z
      .string()
      .optional()
      .describe(
        "Fuzzy search query for channel names/topics. Used when 'id' is not provided. If empty, returns all channels.",
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe("Number of search results (1-100, default 100). Ignored when fetching by ID."),
  }),
  z.object({
    action: z.literal("users"),
    id: z
      .string()
      .optional()
      .describe(
        "User ID to get detailed info about. If provided, returns comprehensive details including avatar, permissions, voice state, presence, and more.",
      ),
    query: z
      .string()
      .optional()
      .describe(
        "Fuzzy search query for username, display name, nickname, or roles. Used when 'id' is not provided. If empty, returns all users.",
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe("Number of search results (1-100, default 100). Ignored when fetching by ID."),
  }),
]);

export const createOracleTool = (channel: TextBasedChannel, guild: Guild | null) =>
  tool({
    description: `The Great Oracle! Search and discover information in the current Discord server.

Actions:
- messages: Search messages OR get detailed info about a specific message by ID (includes reactions, embeds, attachments, mentions, reply chain)
- channels: Search channels OR get detailed info about a specific channel by ID (includes permissions, thread metadata, voice settings)
- users: Search users OR get detailed info about a specific user by ID (includes avatar, permissions, voice state, presence)

When 'id' is provided, returns comprehensive details about that specific entity.
When 'id' is not provided, performs fuzzy search (or lists all if no query).`,
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
          case "messages": {
            if (input.id) {
              const message = await getMessage({
                guild,
                messageId: input.id,
                channelId: input.channelId,
              });

              if (!message) {
                return {
                  success: false,
                  action: "messages",
                  error: `Message with ID '${input.id}' not found`,
                };
              }

              return {
                success: true,
                action: "messages",
                mode: "get",
                result: message,
              };
            }

            const results = await searchMessages({
              guild,
              query: input.query,
              channelId: input.channelId,
              limit: input.limit,
            });
            return {
              success: true,
              action: "messages",
              mode: "search",
              count: results.length,
              results: results.map((r) => ({
                ...r.message,
                relevanceScore: r.score,
              })),
            };
          }

          case "channels": {
            if (input.id) {
              const channelResult = await getChannel({
                guild,
                channelId: input.id,
              });

              if (!channelResult) {
                return {
                  success: false,
                  action: "channels",
                  error: `Channel with ID '${input.id}' not found`,
                };
              }

              return {
                success: true,
                action: "channels",
                mode: "get",
                result: channelResult,
              };
            }

            const results = await listChannels({
              guild,
              query: input.query,
              limit: input.limit,
            });
            return {
              success: true,
              action: "channels",
              mode: "search",
              count: results.length,
              results: results.map((r) => ({
                ...r.channel,
                relevanceScore: r.score,
              })),
            };
          }

          case "users": {
            if (input.id) {
              const user = await getUser({
                guild,
                userId: input.id,
              });

              if (!user) {
                return {
                  success: false,
                  action: "users",
                  error: `User with ID '${input.id}' not found`,
                };
              }

              return {
                success: true,
                action: "users",
                mode: "get",
                result: user,
              };
            }

            const results = await searchUsers({
              guild,
              query: input.query,
              limit: input.limit,
            });
            return {
              success: true,
              action: "users",
              mode: "search",
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
