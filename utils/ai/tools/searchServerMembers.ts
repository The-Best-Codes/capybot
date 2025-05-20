import { Type } from "@google/genai";
import { distance } from "fastest-levenshtein";
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
type SearchAlgorithm = "exact" | "levenshtein";

export const searchServerMembers: ToolDefinition = {
  name: "search_server_members",
  description: "Searches for members in the Discord server",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search query to match member display names or usernames against. Leave empty to get all results.",
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
      searchFields: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: MEMBER_ATTRIBUTES,
        },
        description:
          "Optional list of member attributes to search within. Defaults to displayName and username.",
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
    attributes?: MemberAttribute[];
    searchFields?: MemberAttribute[];
    algorithm?: SearchAlgorithm;
    limit?: number;
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

      let matchingMembers = members;

      if (args.query) {
        const searchFields = args.searchFields || ["displayName", "username"];
        const algorithm = args.algorithm || "levenshtein";

        matchingMembers = members.filter((member) => {
          for (const field of searchFields) {
            let value: string | undefined;

            if (field === "displayName") {
              value = member.displayName;
            } else if (field === "id") {
              value = member.id;
            } else if (field === "joinedAt") {
              value = member.joinedAt?.toISOString();
            } else if (field === "joinedTimestamp") {
              value = member.joinedTimestamp?.toString();
            } else if (field === "nickname") {
              value = member?.nickname || undefined;
            } else if (field === "premiumSince") {
              value = member.premiumSince?.toISOString();
            } else if (field === "premiumSinceTimestamp") {
              value = member.premiumSinceTimestamp?.toString();
            } else if (field === "pending") {
              value = member.pending?.toString();
            } else if (field === "communicationDisabledUntil") {
              value = member.communicationDisabledUntil?.toISOString();
            } else if (field === "communicationDisabledUntilTimestamp") {
              value = member.communicationDisabledUntilTimestamp?.toString();
            } else {
              value = member.user.username; // Default to username if field is not found
            }

            if (value) {
              const query = args.query!.toLowerCase();
              const fieldValue = value.toLowerCase();

              if (algorithm === "exact" && fieldValue.includes(query)) {
                return true;
              } else if (
                algorithm === "levenshtein" &&
                distance(fieldValue, query) <= 2
              ) {
                return true;
              }
            }
          }
          return false;
        });
      }

      let limit = args.limit || 5;
      limit = Math.max(1, Math.min(limit, 50));

      const memberInfo = matchingMembers
        .map((member) => {
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
        })
        .slice(0, limit);

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
