import { Type } from "@google/genai";
import { ActivityType } from "discord.js";
import client from "../../../clients/discord";
import type { ToolDefinition } from "./types";

export const setStatus: ToolDefinition = {
  name: "set_status",
  description: "Sets CapyBot's Discord status message",
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: "The status message to display (1-100 characters)",
      },
    },
    required: ["status"],
  },
  function: async (args: any) => {
    try {
      if (!client.user) {
        return { success: false, message: "Client user is not set" };
      }

      client.user.setPresence({
        activities: [
          {
            name: "CapyBot",
            // @ts-ignore Discord.js types don't include this property
            state: args.status,
            type: ActivityType.Custom,
          },
        ],
        status: "online",
      });

      return { success: true, message: `Status updated to: "${args.status}"` };
    } catch (error) {
      return { success: false, message: "Failed to set status", error };
    }
  },
};
