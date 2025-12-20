import { ActivityType, Client, Events } from "discord.js";
import { logger } from "../utils/logger";

export default {
  event: Events.ClientReady,
  handler: (client: Client) => {
    try {
      if (!client.user) {
        logger.error("Client user is not set.");
        return;
      }
      logger.info("Setting presence...");

      client.user.setPresence({
        activities: [
          {
            name: "chilling",
            state: "chillin' like a capybot",
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
