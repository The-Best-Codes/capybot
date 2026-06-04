import { tool } from "ai";
import type { Guild } from "discord.js";
import { z } from "zod";
import { getUser } from "./serverLookup/getUser";

export const createGetServerUserTool = (guild: Guild | null) =>
  tool({
    description:
      "Get detailed information about a server member by user ID, including roles, permissions, presence, and voice state.",
    inputSchema: z.object({
      userId: z.string().describe("The user ID of the server member to inspect"),
    }),
    execute: async ({ userId }) => {
      if (!guild) {
        return {
          success: false,
          error: "This command can only be used in a server (guild)",
        };
      }

      try {
        const user = await getUser({ guild, userId });

        if (!user) {
          return {
            success: false,
            error: `User with ID '${userId}' not found`,
          };
        }

        return {
          success: true,
          result: user,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });
