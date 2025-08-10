import { Type } from "@google/genai";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

const USER_ATTRIBUTES = [
  "id",
  "username",
  "displayName",
  "discriminator",
  "bot",
  "system",
  "createdAt",
  "createdTimestamp",
  "avatar",
  "banner",
  "accentColor",
  "flags",
  "globalName",
  "avatarDecorationData",
] as const;

type UserAttribute = (typeof USER_ATTRIBUTES)[number];

export const getUserInfo: ToolDefinition = {
  name: "tool_getUserInfo",
  description: "Retrieves information about a Discord user",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: "The Discord user ID to retrieve information for",
      },
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: USER_ATTRIBUTES,
        },
        description:
          "Optional list of user attributes to retrieve. Leave empty to get all available information.",
      },
    },
    required: ["userId"],
  },
  function: async (args: { userId: string; attributes?: UserAttribute[] }) => {
    try {
      const user = await client.users.fetch(args.userId, { force: true });

      if (!user) {
        return { success: false, message: "User not found" };
      }

      const userInfo: Record<string, any> = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        discriminator: user.discriminator || null,
        bot: user.bot,
        system: user.system,
        createdAt: user.createdAt.toISOString(),
        createdTimestamp: user.createdTimestamp,
        avatar: user.avatarURL(),
        banner: user.bannerURL(),
        accentColor: user.accentColor,
        flags: user.flags?.toJSON() || null,
        globalName: user.globalName,
        avatarDecorationData: user.avatarDecorationData,
      };

      if (args.attributes && args.attributes.length > 0) {
        const filteredInfo: Record<string, any> = {};
        for (const attr of args.attributes) {
          if (attr in userInfo) {
            filteredInfo[attr] = userInfo[attr as keyof typeof userInfo];
          }
        }
        return { success: true, user: filteredInfo };
      }

      return { success: true, user: userInfo };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve user information",
        error,
      };
    }
  },
};
