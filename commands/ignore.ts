import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { database, type IgnoreRule } from "../utils/database";
import { logger } from "../utils/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("ignore")
    .setDescription("Ignore messages in a channel or from a user (admin only).")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to ignore messages from.")
        .setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to ignore messages in.")
        .setRequired(false),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;
    if (!interaction.guild) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    if (!interaction.memberPermissions?.has("Administrator")) {
      return interaction.reply({
        content: "You need Administrator permissions to use this command.",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const channel = interaction.options.getChannel("channel");

    if (!user && !channel) {
      return interaction.reply({
        content: "You must specify either a user or a channel to ignore.",
        ephemeral: true,
      });
    }

    let scope: "server" | "channel_specific" = "server";
    let description = "";

    if (user && channel) {
      scope = "channel_specific";
      description = `Ignoring messages from ${user} in ${channel} for this server.`;
    } else if (user) {
      description = `Ignoring messages from ${user} server-wide.`;
    } else if (channel) {
      description = `Ignoring messages in ${channel} server-wide.`;
    }

    const rule: IgnoreRule = {
      guildId: interaction.guild.id,
      userId: user?.id,
      channelId: channel?.id,
      scope,
    };

    try {
      await database.saveIgnoreRule(rule);
      await interaction.reply({
        content: description,
        ephemeral: true,
      });
      logger.log(`Ignore rule added: ${JSON.stringify(rule)}`);
    } catch (error) {
      logger.error("Error saving ignore rule:", error);
      await interaction.reply({
        content: "An error occurred while setting the ignore rule.",
        ephemeral: true,
      });
    }
  },
};
