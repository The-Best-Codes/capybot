import type { TextBasedChannel } from "discord.js";
import { createAddReactionsTool } from "./addReactions";
import { createGenerateImageTool } from "./generateImage";
import { createGetAttachmentDescriptionTool } from "./getAttachmentDescription";

export function createTools(channel: TextBasedChannel) {
  return {
    addReactions: createAddReactionsTool(channel),
    getAttachmentDescription: createGetAttachmentDescriptionTool(),
    generateImage: createGenerateImageTool(),
  };
}

export type Tools = ReturnType<typeof createTools>;
