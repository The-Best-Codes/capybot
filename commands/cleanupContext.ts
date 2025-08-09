import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { database } from "../utils/database";

export default {
  data: new SlashCommandBuilder()
    .setName("cleanup_context")
    .setDescription("Clean up old conversation data")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days of data to keep (default: 30)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    // Check permissions
    if (!interaction.memberPermissions?.has("ManageMessages")) {
      await interaction.reply({
        content: "You do not have the permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const daysToKeep = interaction.options.getInteger("days") || 30;

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      await database.cleanupOldData(daysToKeep);

      await interaction.editReply({
        content: `✅ Successfully cleaned up conversation data older than ${daysToKeep} days.`,
      });
    } catch (error) {
      console.error("Error cleaning up context:", error);
      await interaction.editReply({
        content: "❌ An error occurred while cleaning up the data.",
      });
    }
  },
};
