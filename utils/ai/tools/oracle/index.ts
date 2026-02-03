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

IMPORTANT: Each action has its own ID space. A channel ID is NOT a message ID.
- To find messages in a channel, first get the channel, then search messages with channelId filter
- Message IDs and channel IDs are different - don't confuse them

Actions:
- messages: Search messages by content/author OR get a specific message by its message ID. Query is plain text fuzzy search (not a filter syntax).
- channels: List/search channels by name OR get a specific channel by its channel ID
- users: List/search users by name/nickname OR get a specific user by their user ID

Query parameter: Plain text for fuzzy matching (e.g., "hello world", "john"). NOT a filter syntax - "channel:123" won't work.
To filter messages by channel, use the channelId parameter instead.`,
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
              const { message, warning } = await getMessage({
                guild,
                messageId: input.id,
                channelId: input.channelId,
              });

              if (!message) {
                return {
                  success: false,
                  action: "messages",
                  error: `Message with ID '${input.id}' not found`,
                  warning,
                };
              }

              return {
                success: true,
                action: "messages",
                mode: "get",
                result: message,
                warning,
              };
            }

            const searchResult = await searchMessages({
              guild,
              query: input.query,
              channelId: input.channelId,
              limit: input.limit,
            });
            return {
              success: true,
              action: "messages",
              mode: "search",
              count: searchResult.results.length,
              totalSearched: searchResult.totalSearched,
              truncated: searchResult.truncated,
              warning: searchResult.warning,
              results: searchResult.results.map((r) => ({
                ...r.message,
                relevanceScore: r.score === -1 ? null : r.score,
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

            const listResult = await listChannels({
              guild,
              query: input.query,
              limit: input.limit,
            });
            return {
              success: true,
              action: "channels",
              mode: "search",
              count: listResult.results.length,
              totalChannels: listResult.totalChannels,
              truncated: listResult.truncated,
              results: listResult.results.map((r) => ({
                ...r.channel,
                relevanceScore: r.score === -1 ? null : r.score,
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

            const userResult = await searchUsers({
              guild,
              query: input.query,
              limit: input.limit,
            });
            return {
              success: true,
              action: "users",
              mode: "search",
              count: userResult.results.length,
              totalMembers: userResult.totalMembers,
              truncated: userResult.truncated,
              warning: userResult.warning,
              results: userResult.results.map((r) => ({
                ...r.user,
                relevanceScore: r.score === -1 ? null : r.score,
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
