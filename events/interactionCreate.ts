import { Client, Events, type Interaction } from "discord.js";
import {
  DEV_LOGIN_MODAL_ID,
  handleLoginModal,
  createLoginModal,
} from "../commands/devlogin";

export default {
  event: Events.InteractionCreate,
  handler: async (_client: Client, interaction: Interaction) => {
    if (interaction.isModalSubmit()) {
      if (interaction.customId === DEV_LOGIN_MODAL_ID) {
        await handleLoginModal(interaction);
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "dev_login_button") {
        const modal = createLoginModal();
        await interaction.showModal(modal);
      }
    }
  },
};
