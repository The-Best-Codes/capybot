import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("help").setDescription("Learn how to use CapyBot"),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    await interaction.reply(
      "**CapyBot help**\n" +
        "CapyBot is a Discord AI bot that responds when you mention it, reply to it, or continue a recent conversation with it.\n" +
        "To get access, contact BestCodes at <https://bestcodes.dev/contact> or DM BestCodes on Discord (<https://go.bestcodes.dev/discord>) and ask for CapyBot access.\n" +
        "Some features, like DMs, may require extra permission.",
    );
  },
};
