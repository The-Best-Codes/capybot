import { Type } from "@google/genai";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

const MEMBER_ATTRIBUTES = [
  "id",
  "displayName",
  "joinedAt",
  "joinedTimestamp",
  "nickname",
  "premiumSince",
  "premiumSinceTimestamp",
  "pending",
  "communicationDisabledUntil",
  "communicationDisabledUntilTimestamp",
] as const;

type MemberAttribute = (typeof MEMBER_ATTRIBUTES)[number];

export const searchServerMembers: ToolDefinition = {
  name: "search_server_members",
  description: "Searches for members in the Discord server",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search query to match member display names or usernames against",
      },
      guildId: {
        type: Type.STRING,
        description: "The ID of the Discord guild to search in.",
      },
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: MEMBER_ATTRIBUTES,
        },
        description:
          "Optional list of member attributes to retrieve. Leave empty to get all available information.",
      },
    },
    required: ["query", "guildId"],
  },
  function: async (args: {
    query: string;
    guildId: string;
    attributes?: MemberAttribute[];
  }) => {
    try {
      const guild = await client.guilds.fetch(args.guildId);
      if (!guild) {
        return { success: false, message: "Guild not found" };
      }

      const members = await guild.members.fetch();

      if (!members) {
        return { success: false, message: "No members found in this guild" };
      }

      const matchingMembers = members.filter((member) => {
        return (
          member.displayName.toLowerCase().includes(args.query.toLowerCase()) ||
          member.user.username.toLowerCase().includes(args.query.toLowerCase())
        );
      });

      const memberInfo = matchingMembers.map((member) => {
        const baseInfo: Record<string, any> = {
          id: member.id,
          displayName: member.displayName,
          joinedAt: member.joinedAt?.toISOString(),
          joinedTimestamp: member.joinedTimestamp,
          nickname: member.nickname,
          premiumSince: member.premiumSince?.toISOString(),
          premiumSinceTimestamp: member.premiumSinceTimestamp,
          pending: member.pending,
          communicationDisabledUntil:
            member.communicationDisabledUntil?.toISOString(),
          communicationDisabledUntilTimestamp:
            member.communicationDisabledUntilTimestamp,
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

      return { success: true, members: memberInfo };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve members",
        error,
      };
    }
  },
};
