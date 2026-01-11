import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { requireDevAuth } from "../utils/auth/devCommandGuard";

export default {
  data: new SlashCommandBuilder()
    .setName("dev_flex")
    .setDescription("Flex your status as a CapyBot developer"),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    const isAuthed = await requireDevAuth(interaction);
    if (!isAuthed) return;

    const nickname = interaction.inGuild()
      ? (interaction.member as any)?.nickname ||
        (interaction.member as any)?.nick
      : null;
    const displayName =
      nickname || interaction.user.displayName || interaction.user.username;

    await interaction.reply(
      `**${displayName}** has CapyBot developer access. So cool! ✨`,
    );
  },
};
