import { Type } from "@google/genai";
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

export const searchChannels: ToolDefinition = {
  name: "search_channels",
  description: "Searches for channels in the Discord server",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search query to match channel names or topics against",
      },
      guildId: {
        type: Type.STRING,
        description: "The ID of the Discord guild to search in.",
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
    },
    required: ["query", "guildId"],
  },
  function: async (args: {
    query: string;
    guildId: string;
    attributes?: ChannelAttribute[];
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

      const matchingChannels = channels.filter((channel) => {
        if (!channel) return false;

        return (
          channel.name?.toLowerCase().includes(args.query.toLowerCase()) ||
          // @ts-ignore
          channel?.topic?.toLowerCase().includes(args.query.toLowerCase())
        );
      });

      const channelInfo = matchingChannels.map((channel) => {
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
      });

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
