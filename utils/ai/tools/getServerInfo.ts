import { Type } from "@google/genai";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

const SERVER_ATTRIBUTES = [
  "id",
  "name",
  "description",
  "icon",
  "banner",
  "splash",
  "discoverySplash",
  "ownerId",
  "memberCount",
  "approximateMemberCount",
  "approximatePresenceCount",
  "maxMembers",
  "maxPresences",
  "maxVideoChannelUsers",
  "vanityURLCode",
  "verificationLevel",
  "explicitContentFilter",
  "defaultMessageNotifications",
  "mfaLevel",
  "systemChannelId",
  "systemChannelFlags",
  "rulesChannelId",
  "publicUpdatesChannelId",
  "preferredLocale",
  "afkChannelId",
  "afkTimeout",
  "widgetEnabled",
  "widgetChannelId",
  "nsfwLevel",
  "premiumTier",
  "premiumSubscriptionCount",
  "features",
  "createdAt",
  "createdTimestamp",
  "joinedAt",
  "joinedTimestamp",
  "large",
  "unavailable",
  "boostLevel",
  "boostCount",
] as const;

type ServerAttribute = (typeof SERVER_ATTRIBUTES)[number];

export const getServerInfo: ToolDefinition = {
  name: "get_server_info",
  description: "Retrieves information about the Discord server/guild",
  parameters: {
    type: Type.OBJECT,
    properties: {
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: SERVER_ATTRIBUTES,
        },
        description:
          "Optional list of server attributes to retrieve. Leave empty to get all available information.",
      },
    },
    required: [],
  },
  function: async (args: {
    guildId: string;
    attributes?: ServerAttribute[];
  }) => {
    try {
      const guild = await client.guilds.fetch(args.guildId);

      if (!guild) {
        return { success: false, message: "Server not found" };
      }

      const serverInfo: Record<string, any> = {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        icon: guild.iconURL(),
        banner: guild.bannerURL(),
        splash: guild.splashURL(),
        discoverySplash: guild.discoverySplashURL(),
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
        approximateMemberCount: guild.approximateMemberCount,
        approximatePresenceCount: guild.approximatePresenceCount,
        maxVideoChannelUsers: guild.maxVideoChannelUsers,
        vanityURLCode: guild.vanityURLCode,
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        mfaLevel: guild.mfaLevel,
        systemChannelId: guild.systemChannelId,
        systemChannelFlags: guild.systemChannelFlags?.toJSON() || null,
        rulesChannelId: guild.rulesChannelId,
        publicUpdatesChannelId: guild.publicUpdatesChannelId,
        preferredLocale: guild.preferredLocale,
        afkChannelId: guild.afkChannelId,
        afkTimeout: guild.afkTimeout,
        widgetEnabled: guild.widgetEnabled,
        widgetChannelId: guild.widgetChannelId,
        nsfwLevel: guild.nsfwLevel,
        premiumTier: guild.premiumTier,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        features: guild.features,
        createdAt: guild.createdAt.toISOString(),
        createdTimestamp: guild.createdTimestamp,
        joinedAt: guild.joinedAt?.toISOString(),
        joinedTimestamp: guild.joinedTimestamp,
        large: guild.large,
        boostLevel: guild.premiumTier, // Alias for premiumTier
        boostCount: guild.premiumSubscriptionCount, // Alias for premiumSubscriptionCount
      };

      if (args.attributes && args.attributes.length > 0) {
        const filteredInfo: Record<string, any> = {};
        for (const attr of args.attributes) {
          if (attr in serverInfo) {
            filteredInfo[attr] = serverInfo[attr as keyof typeof serverInfo];
          }
        }
        return { success: true, server: filteredInfo };
      }

      return { success: true, server: serverInfo };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve server information",
        error,
      };
    }
  },
};
