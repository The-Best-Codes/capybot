import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import packageJson from "../package.json";

export default {
  data: new SlashCommandBuilder()
    .setName("version")
    .setDescription("See CapyBot version for debugging purposes"),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const version = packageJson.version;
    const interaction = data.interaction;
    await interaction.reply(`CapyBot version: ${version}`);
  },
};
