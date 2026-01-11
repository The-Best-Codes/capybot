import { Client, Events, type Interaction } from "discord.js";
import { DEV_LOGIN_MODAL_ID, handleLoginModal } from "../commands/devlogin";

export default {
  event: Events.InteractionCreate,
  handler: async (_client: Client, interaction: Interaction) => {
    if (interaction.isModalSubmit()) {
      if (interaction.customId === DEV_LOGIN_MODAL_ID) {
        await handleLoginModal(interaction);
      }
    }
  },
};
