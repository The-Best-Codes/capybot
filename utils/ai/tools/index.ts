import type { Guild, TextBasedChannel } from "discord.js";
import { createAddReactionsTool } from "./addReactions";
import { createGenerateImageTool } from "./generateImage";
import { createGetAttachmentDescriptionTool } from "./getAttachmentDescription";
import { createOracleTool } from "./oracle";

export function createTools(channel: TextBasedChannel, guild: Guild | null) {
  return {
    addReactions: createAddReactionsTool(channel),
    getAttachmentDescription: createGetAttachmentDescriptionTool(),
    generateImage: createGenerateImageTool(),
    oracle: createOracleTool(channel, guild),
  };
}

export type Tools = ReturnType<typeof createTools>;
