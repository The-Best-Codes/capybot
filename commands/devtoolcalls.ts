import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { toolCallStore } from "../utils/db/toolCallsDb";

export default {
  data: new SlashCommandBuilder()
    .setName("dev_toolcalls")
    .setDescription("Get tool calls for a message")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("The message ID to get tool calls for")
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
