import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { buildContext } from "../utils/ai/context/index";

export default {
  data: new SlashCommandBuilder()
    .setName("dev_context")
    .setDescription("Get the full AI context for a message")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("The message ID to get context for")
        .setRequired(true),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messageId;
    const messageIdRaw = interaction.options.getString("message_id");
    try {
      const messageUrl = new URL(messageIdRaw as string);
      messageId = messageUrl.pathname.split("/").pop();
    } catch {
      messageId = messageIdRaw;
    }

    if (!messageId) {
      await interaction.editReply("Message ID is required.");
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
