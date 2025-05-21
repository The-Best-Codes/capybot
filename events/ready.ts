import { ActivityType, Client, Events } from "discord.js";
import { logger } from "../utils/logger";

export default {
  event: Events.ClientReady,
  handler: async (client: Client) => {
    try {
      if (!client.user) {
        logger.error("Client user is not set.");
        return;
      }

      let aiStatus = "just chillin'";

      client.user.setPresence({
        activities: [
          {
            name: "CapyBot",
            state: aiStatus,
            type: ActivityType.Custom,
          },
        ],
        status: "online",
      });
    } catch (err) {
      logger.error("Error setting presence:", err);
    } finally {
      logger.success("Presence set.");
    }
  },
};
