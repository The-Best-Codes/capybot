import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { toolCallStore } from "../utils/db/toolCallsDb";
import { requireDevAuth } from "../utils/auth/devCommandGuard";

export default {
  data: new SlashCommandBuilder()
    .setName("dev_toolcalls")
    .setDescription("Get tool calls for a message")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription(
          "The message ID to get tool calls for (optional, defaults to latest message)",
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

    const toolCalls = await toolCallStore.get(messageId);

    if (toolCalls.length === 0) {
      await interaction.editReply("No tool calls found for this message.");
      return;
    }

    const response = toolCalls
      .map((toolCall, index) => {
        return `**${index + 1}. ${toolCall.toolName}**${toolCall.isError ? " ❌" : ""}\n\`\`\`json\n${JSON.stringify(toolCall.input, null, 2)}\`\`\`${toolCall.output ? `\n**Output:**\n\`\`\`json\n${JSON.stringify(toolCall.output, null, 2)}\`\`\`` : ""}${toolCall.error ? `\n**Error:** ${toolCall.error}` : ""}`;
      })
      .join("\n\n");

    if (response.length > 1900) {
      let truncated = response.substring(0, 1900);

      const codeBlockCount = (truncated.match(/```/g) || []).length;
      if (codeBlockCount % 2 === 1) {
        truncated += "\n```";
      }

      truncated += "\n[...truncated]";
      await interaction.editReply(truncated);
      return;
    }

    await interaction.editReply(response);
  },
};
