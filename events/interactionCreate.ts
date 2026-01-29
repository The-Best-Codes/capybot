import { Client, Events, type Interaction } from "discord.js";
import { DEV_LOGIN_MODAL_ID, handleLoginModal } from "../commands/devlogin";
import { analytics } from "../utils/analytics/index";
import { logger } from "../utils/logger";

export default {
  event: Events.InteractionCreate,
  handler: async (_client: Client, interaction: Interaction) => {
    analytics.trackEvent({ eventName: Events.InteractionCreate }).catch(() => {});

    if (interaction.isCommand()) {
      let options: Record<string, any> | undefined;
      if (interaction.isChatInputCommand()) {
        options = {};
        interaction.options.data.forEach((option) => {
          options![option.name] = option.value;
        });
      }

      analytics
        .trackCommand({
          commandName: interaction.commandName,
          userId: interaction.user.id,
          username: interaction.user.username,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          success: true,
          options: options && Object.keys(options).length > 0 ? options : undefined,
        })
        .catch((err) => {
          logger.error(`Failed to track command analytics: ${err}`);
        });
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === DEV_LOGIN_MODAL_ID) {
        await handleLoginModal(interaction);
      }
    }
  },
};
