import { Type } from "@google/genai";
import { distance } from "fastest-levenshtein";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

const ROLE_ATTRIBUTES = [
  "id",
  "name",
  "color",
  "permissions",
  "createdAt",
  "createdTimestamp",
  "mentionable",
] as const;

type RoleAttribute = (typeof ROLE_ATTRIBUTES)[number];
type SearchAlgorithm = "exact" | "levenshtein";

export const searchRoles: ToolDefinition = {
  name: "search_roles",
  description: "Searches for roles in the Discord server",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search query to match role names against. Leave empty to get all results.",
      },
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: ROLE_ATTRIBUTES,
        },
        description:
          "Optional list of role attributes to retrieve. Leave empty to get all available information.",
      },
      searchFields: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: ROLE_ATTRIBUTES,
        },
        description:
          "Optional list of role attributes to search within. Defaults to name.",
      },
      algorithm: {
        type: Type.STRING,
        enum: ["exact", "levenshtein"],
        description: "The search algorithm to use. Defaults to exact.",
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
    attributes?: RoleAttribute[];
    searchFields?: RoleAttribute[];
    algorithm?: SearchAlgorithm;
    limit?: number;
  }) => {
    try {
      const guild = await client.guilds.fetch(args.guildId);
      if (!guild) {
        return { success: false, message: "Guild not found" };
      }

      const roles = await guild.roles.fetch();
      if (!roles) {
        return { success: false, message: "No roles found in this guild" };
      }

      let matchingRoles = roles;

      if (args.query) {
        const searchFields = args.searchFields || ["name"];
        const algorithm = args.algorithm || "exact";

        matchingRoles = roles.filter((role) => {
          for (const field of searchFields) {
            let value: string | undefined;

            if (field === "name") {
              value = role.name;
            } else if (field === "id") {
              value = role.id;
            } else if (field === "color") {
              value = role.hexColor;
            } else if (field === "permissions") {
              value = JSON.stringify(role.permissions.toJSON());
            } else if (field === "createdAt") {
              value = role.createdAt.toISOString();
            } else if (field === "createdTimestamp") {
              value = role.createdTimestamp.toString();
            } else if (field === "mentionable") {
              value = role.mentionable ? "true" : "false";
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

      const roleInfo = matchingRoles
        .map((role) => {
          const baseInfo: Record<string, any> = {
            id: role.id,
            name: role.name,
            color: role.hexColor,
            permissions: role.permissions.toJSON(),
            createdAt: role.createdAt.toISOString(),
            createdTimestamp: role.createdTimestamp,
            mentionable: role.mentionable,
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

      return { success: true, roles: roleInfo };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve roles",
        error,
      };
    }
  },
};
