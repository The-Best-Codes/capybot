import type { Guild, TextBasedChannel } from "discord.js";
import { createAddReactionsTool } from "./addReactions";
import { createGenerateImageTool } from "./generateImage";
import { createGetServerChannelTool } from "./getServerChannel";
import { createGetServerMessageTool } from "./getServerMessage";
import { createGetServerUserTool } from "./getServerUser";
import { createGetAttachmentDescriptionTool } from "./getAttachmentDescription";
import { createSearchServerChannelsTool } from "./searchServerChannels";
import { createSearchServerMessagesTool } from "./searchServerMessages";
import { createSearchServerUsersTool } from "./searchServerUsers";
import { createBrowseWebTool } from "./browseWeb";

export function createTools(channel: TextBasedChannel, guild: Guild | null) {
  return {
    addReactions: createAddReactionsTool(channel),
    browseWeb: createBrowseWebTool(),
    getAttachmentDescription: createGetAttachmentDescriptionTool(),
    generateImage: createGenerateImageTool(),
    getServerChannel: createGetServerChannelTool(guild),
    searchServerChannels: createSearchServerChannelsTool(guild),
    getServerMessage: createGetServerMessageTool(guild),
    searchServerMessages: createSearchServerMessagesTool(guild),
    getServerUser: createGetServerUserTool(guild),
    searchServerUsers: createSearchServerUsersTool(guild),
  };
}

export type Tools = ReturnType<typeof createTools>;
