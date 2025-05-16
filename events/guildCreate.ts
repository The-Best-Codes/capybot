import { Client, Events, Guild } from "discord.js";
import { logger } from "../utils/logger";

export default {
  event: Events.GuildCreate,
  handler: async (client: Client, guild: Guild) => {
    try {
      await guild.systemChannel?.send("Hey everyone!");
      logger.info(`Joined new guild: ${guild.name} (ID: ${guild.id})`);
    } catch (error) {
      logger.error(
        `Error sending welcome message to guild ${guild.id}: ${error}`,
      );
    }
  },
};
