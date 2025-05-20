import { Type } from "@google/genai";
import { distance } from "fastest-levenshtein";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

const CHANNEL_ATTRIBUTES = [
  "id",
  "name",
  "type",
  "topic",
  "nsfw",
  "createdAt",
  "createdTimestamp",
] as const;

type ChannelAttribute = (typeof CHANNEL_ATTRIBUTES)[number];

type SearchAlgorithm = "exact" | "levenshtein";

export const searchChannels: ToolDefinition = {
  name: "search_channels",
  description: "Searches for channels in the Discord server",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search query to match channel names or topics against. Leave empty to get all results.",
      },
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: CHANNEL_ATTRIBUTES,
        },
        description:
          "Optional list of channel attributes to retrieve. Leave empty to get all available information.",
      },
      searchFields: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: CHANNEL_ATTRIBUTES,
        },
        description:
          "Optional list of channel attributes to search within. Defaults to name and topic.",
      },
      algorithm: {
        type: Type.STRING,
        enum: ["exact", "levenshtein"],
        description: "The search algorithm to use. Defaults to levenshtein.",
      },
      limit: {
        type: Type.NUMBER,
        description:
          "The maximum number of results to return. Defaults to 5, min 1, max 50.",
      },
    },
    required: [],
  },
  function: async (args: {
    query?: string;
    guildId: string;
    attributes?: ChannelAttribute[];
    searchFields?: ChannelAttribute[];
    algorithm?: SearchAlgorithm;
    limit?: number;
  }) => {
    try {
      const guild = await client.guilds.fetch(args.guildId);
      if (!guild) {
        return { success: false, message: "Guild not found" };
      }

      const channels = await guild.channels.fetch();
      if (!channels) {
        return { success: false, message: "No channels found in this guild" };
      }

      let channelsArray = [...channels.values()].filter(
        (channel) => channel !== null,
      );

      if (args.query) {
        const searchFields = args.searchFields || ["name", "topic"];
        const algorithm = args.algorithm || "levenshtein";
        const query = args.query.toLowerCase();

        if (algorithm === "exact") {
          channelsArray = channelsArray.filter((channel) => {
            if (!channel) return false;

            for (const field of searchFields) {
              let value: string | undefined;

              if (field === "name") {
                value = channel.name;
              } else if (field === "topic") {
                // @ts-ignore
                value = channel.topic;
              } else if (field === "id") {
                value = channel.id;
              } else if (field === "type") {
                value = channel.type.toString();
              } else if (field === "nsfw") {
                // @ts-ignore
                value = channel.nsfw ? "true" : "false";
              } else if (field === "createdAt") {
                value = channel.createdAt.toISOString();
              } else if (field === "createdTimestamp") {
                value = channel.createdTimestamp.toString();
              }

              if (value && value.toLowerCase().includes(query)) {
                return true;
              }
            }
            return false;
          });
        } else if (algorithm === "levenshtein") {
          // For levenshtein, calculate distance for each channel and sort by closest match
          channelsArray = channelsArray
            .map((channel) => {
              if (!channel) return { channel, bestDistance: Infinity };

              let bestDistance = Infinity;

              for (const field of searchFields) {
                let value: string | undefined;

                if (field === "name") {
                  value = channel.name;
                } else if (field === "topic") {
                  // @ts-ignore
                  value = channel.topic;
                } else if (field === "id") {
                  value = channel.id;
                } else if (field === "type") {
                  value = channel.type.toString();
                } else if (field === "nsfw") {
                  // @ts-ignore
                  value = channel.nsfw ? "true" : "false";
                } else if (field === "createdAt") {
                  value = channel.createdAt.toISOString();
                } else if (field === "createdTimestamp") {
                  value = channel.createdTimestamp.toString();
                }

                if (value) {
                  const fieldValue = value.toLowerCase();
                  const currentDistance = distance(fieldValue, query);
                  bestDistance = Math.min(bestDistance, currentDistance);
                }
              }

              return { channel, bestDistance };
            })
            .filter((item) => item.channel !== null)
            .sort((a, b) => a.bestDistance - b.bestDistance)
            .map((item) => item.channel);
        }
      }

      let limit = args.limit || 5;
      limit = Math.max(1, Math.min(limit, 50));

      const channelInfo = channelsArray
        .slice(0, limit)
        .map((channel) => {
          if (!channel) return null;

          const baseInfo: Record<string, any> = {
            id: channel.id,
            name: channel.name,
            type: channel.type,
            // @ts-ignore
            topic: channel?.topic || null,
            // @ts-ignore
            nsfw: channel?.nsfw || null,
            createdAt: channel.createdAt.toISOString(),
            createdTimestamp: channel.createdTimestamp,
          };

          if (args.attributes && args.attributes.length > 0) {
            const filteredInfo: Record<string, any> = {};
            for (const attr of args.attributes) {
              if (attr in baseInfo) {
                filteredInfo[attr] = baseInfo[attr as keyof typeof baseInfo];
              }
            }
            return filteredInfo;
          }

          return baseInfo;
        })
        .slice(0, limit);

      return { success: true, channels: channelInfo };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve channels",
        error,
      };
    }
  },
};
