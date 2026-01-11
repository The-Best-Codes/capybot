import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { buildContext } from "../utils/ai/context/index";
import { requireDevAuth } from "../utils/auth/devCommandGuard";

export default {
  data: new SlashCommandBuilder()
    .setName("dev_context")
    .setDescription("Get the full AI context for a message")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription(
          "The message ID to get context for (optional, defaults to latest message)",
        )
        .setRequired(false),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    const isAuthed = await requireDevAuth(interaction);
    if (!isAuthed) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messageId;
    const messageIdRaw = interaction.options.getString("message_id");

    if (messageIdRaw) {
      try {
        const messageUrl = new URL(messageIdRaw as string);
        messageId = messageUrl.pathname.split("/").pop();
      } catch {
        messageId = messageIdRaw;
      }
    } else {
      const messages = await interaction.channel?.messages.fetch({ limit: 1 });
      messageId = messages?.first()?.id;
    }

    if (!messageId) {
      await interaction.editReply("Could not determine message ID.");
      return;
    }

    if (
      !interaction.channel ||
      interaction.channel.type === ChannelType.DM ||
      interaction.channel.type === ChannelType.GroupDM
    ) {
      await interaction.editReply("This command can only be used in servers.");
      return;
    }

    try {
      const message = await interaction.channel.messages.fetch(messageId);

      const context = await buildContext(message);
      const buffer = Buffer.from(context, "utf-8");

      await interaction.editReply({
        content: "Context retrieved successfully.",
        files: [
          {
            attachment: buffer,
            name: `context_${messageId}.json`,
          },
        ],
      });
    } catch (error) {
      await interaction.editReply(
        `Failed to fetch message or build context: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
