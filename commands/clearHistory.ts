import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("clear_history")
    .setDescription("Clears conversation history for CapyBot in this channel"),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    if (!interaction.memberPermissions?.has("ManageMessages")) {
      await interaction.reply({
        content: "You do not have the permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: "{% clear_history_before %}",
    });
  },
};
