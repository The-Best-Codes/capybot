import {
  ChannelType,
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { checkDevAuth } from "../utils/auth/devAuth";
import { hasPermission } from "../utils/auth/permissions";

export const MANUAL_MESSAGE_MODAL_ID = "obsidian_quokka_manual_message";
const MESSAGE_INPUT_ID = "manual_message_content";
const REPLY_INPUT_ID = "manual_message_reply_id";

function createManualMessageModal(channelId: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`${MANUAL_MESSAGE_MODAL_ID}:${channelId}`)
    .setTitle("Obsidian Quokka Dispatch");

  const messageInput = new TextInputBuilder()
    .setCustomId(MESSAGE_INPUT_ID)
    .setPlaceholder("Message for CapyBot to send")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000);

  const replyInput = new TextInputBuilder()
    .setCustomId(REPLY_INPUT_ID)
    .setPlaceholder("Optional Discord message ID to reply to")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addLabelComponents(
    new LabelBuilder().setLabel("Message").setTextInputComponent(messageInput),
    new LabelBuilder().setLabel("Reply to message ID (optional)").setTextInputComponent(replyInput),
  );

  return modal;
}

function canUseManualMessage(userId: string, username: string): boolean {
  const authResult = checkDevAuth(userId, username);
  return authResult.loggedIn && hasPermission(authResult.permissions, "manual_message");
}

export async function handleManualMessageModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!canUseManualMessage(interaction.user.id, interaction.user.username)) {
    await interaction.reply({
      content: "You are not allowed to use this dispatch.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channelId = interaction.customId.slice(`${MANUAL_MESSAGE_MODAL_ID}:`.length);
  const channel = await interaction.client.channels.fetch(channelId);

  if (!channel || channel.type !== ChannelType.GuildText || !(channel instanceof TextChannel)) {
    await interaction.reply({
      content: "That channel is not a server text channel anymore.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const content = interaction.fields.getTextInputValue(MESSAGE_INPUT_ID).trim();
  const replyId = interaction.fields.getTextInputValue(REPLY_INPUT_ID).trim();

  if (!content) {
    await interaction.reply({
      content: "Message cannot be empty.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    if (replyId) {
      const replyTarget = await channel.messages.fetch(replyId);
      await replyTarget.reply({ content });
    } else {
      await channel.send({ content });
    }
  } catch {
    await interaction.reply({
      content:
        "Could not send the message. Check that CapyBot can post there and that the reply message ID is valid for that channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `Sent to ${channel}.`,
    flags: MessageFlags.Ephemeral,
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("obsidian_quokka")
    .setDescription("classified quokka dispatch")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Server channel to send from CapyBot")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    if (!canUseManualMessage(interaction.user.id, interaction.user.username)) {
      await interaction.reply({
        content: "You are not allowed to use this dispatch.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true, [ChannelType.GuildText]);
    await interaction.showModal(createManualMessageModal(channel.id));
  },
};
