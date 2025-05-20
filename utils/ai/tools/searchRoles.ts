import { Type } from "@google/genai";
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

export const searchRoles: ToolDefinition = {
  name: "search_roles",
  description: "Searches for roles in the Discord server",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query to match role names against",
      },
      guildId: {
        type: Type.STRING,
        description: "The ID of the Discord guild to search in.",
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
    },
    required: ["query", "guildId"],
  },
  function: async (args: {
    query: string;
    guildId: string;
    attributes?: RoleAttribute[];
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

      const matchingRoles = roles.filter((role) =>
        role.name.toLowerCase().includes(args.query.toLowerCase()),
      );

      const roleInfo = matchingRoles.map((role) => {
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
      });

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
