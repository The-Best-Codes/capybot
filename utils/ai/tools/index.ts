import type { TextBasedChannel } from "discord.js";
import { createAddReactionsTool } from "./addReactions";

export function createTools(channel: TextBasedChannel) {
  return {
    addReactions: createAddReactionsTool(channel),
  };
}

export type Tools = ReturnType<typeof createTools>;
