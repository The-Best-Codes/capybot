import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { database } from "../utils/database";
import { logger } from "../utils/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("unignore")
    .setDescription("Remove an ignore rule for a channel or user (admin only).")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to stop ignoring.")
        .setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to stop ignoring.")
        .setRequired(false),
    ),

  handler: async (interaction: ChatInputCommandInteraction) => {
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
        content: "You must specify either a user or a channel to unignore.",
        ephemeral: true,
      });
    }

    let description = "";
    let scope = "";

    if (user && channel) {
      scope = "channel_specific";
      description = `No longer ignoring messages from ${user} in ${channel}.`;
    } else if (user) {
      scope = "server";
      description = `No longer ignoring messages from ${user} server-wide.`;
    } else if (channel) {
      scope = "server";
      description = `No longer ignoring messages in ${channel} server-wide.`;
    }

    try {
      await database.deleteIgnoreRule(
        interaction.guild.id,
        user?.id,
        channel?.id,
        scope,
      );
      await interaction.reply({
        content: description,
        ephemeral: true,
      });
      logger.log(
        `Ignore rule removed for guild ${interaction.guild.id}, user ${user?.id}, channel ${channel?.id}, scope ${scope}`,
      );
    } catch (error) {
      logger.error("Error deleting ignore rule:", error);
      await interaction.reply({
        content: "An error occurred while removing the ignore rule.",
        ephemeral: true,
      });
    }
  },
};
