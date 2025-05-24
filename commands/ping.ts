import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("Ping!"),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;
    await interaction.reply(
      "Pong!\nPing received <t:" + (Date.now() / 1000).toFixed(0) + ":R>.",
    );
  },
};
