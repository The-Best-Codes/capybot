import { generateText } from "ai";
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { globalModel } from "../clients/ai";
import { checkDevAuth } from "../utils/auth/devAuth";
import { hasPermission } from "../utils/auth/permissions";

const DEFAULT_MESSAGE_COUNT = 50;
const MAX_MESSAGE_COUNT = 250;

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toUTCString();
}

export default {
  data: new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Summarize recent messages in this channel")
    .addIntegerOption((option) =>
      option
        .setName("messages")
        .setDescription(`How many recent messages to summarize (max ${MAX_MESSAGE_COUNT})`)
        .setMinValue(1)
        .setMaxValue(MAX_MESSAGE_COUNT)
        .setRequired(false),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;
    const authResult = checkDevAuth(interaction.user.id, interaction.user.username);

    if (!authResult.loggedIn) {
      await interaction.reply({
        content: "This command requires developer authentication. Use `/dev_login` first.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!hasPermission(authResult.permissions, "summarize")) {
      await interaction.reply({
        content:
          "Your developer key does not have permission to summarize conversations. Contact an admin to update your key permissions.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (
      !interaction.channel ||
      interaction.channel.type === ChannelType.DM ||
      interaction.channel.type === ChannelType.GroupDM ||
      !("messages" in interaction.channel)
    ) {
      await interaction.reply({
        content: "This command can only summarize server channels.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requestedCount = interaction.options.getInteger("messages") ?? DEFAULT_MESSAGE_COUNT;
    const messageCount = Math.min(requestedCount, MAX_MESSAGE_COUNT);
    const fetchedMessages = await interaction.channel.messages.fetch({ limit: messageCount });
    const messages = Array.from(fetchedMessages.values())
      .filter((message) => !message.system)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((message) => ({
        author: message.author.displayName || message.author.username,
        timestamp: formatTimestamp(message.createdTimestamp),
        content: message.content || (message.attachments.size > 0 ? "[attachment]" : "[no text]"),
      }));

    if (messages.length === 0) {
      await interaction.editReply("No recent messages found to summarize.");
      return;
    }

    const transcript = messages
      .map((message) => `[${message.timestamp}] ${message.author}: ${message.content}`)
      .join("\n");

    const result = await generateText({
      model: globalModel,
      system:
        "You summarize Discord conversations. Be concise, neutral, and useful. Do not invent details. Mention important decisions, questions, links, or follow-ups if present.",
      prompt: `Summarize these ${messages.length} recent messages from #${"name" in interaction.channel ? interaction.channel.name : "this-channel"}. Keep it short.\n\n${transcript}`,
    });

    const summary = result.text.trim() || "I couldn't generate a summary for those messages.";
    await interaction.editReply(`**Summary of the last ${messages.length} messages**\n${summary}`);
  },
};
