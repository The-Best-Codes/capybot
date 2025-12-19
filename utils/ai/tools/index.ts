import type { TextBasedChannel } from "discord.js";
import { createAddReactionsTool } from "./addReactions";
import { createGetAttachmentDescriptionTool } from "./getAttachmentDescription";

export function createTools(channel: TextBasedChannel) {
  return {
    addReactions: createAddReactionsTool(channel),
    getAttachmentDescription: createGetAttachmentDescriptionTool(),
  };
}

export type Tools = ReturnType<typeof createTools>;
