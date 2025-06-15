import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { database } from "../utils/database";

export default {
  data: new SlashCommandBuilder()
    .setName("context_info")
    .setDescription(
      "Show information about the conversation context and stored data",
    )
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Show AI response parts for a specific message ID")
        .setRequired(false),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;
    const messageId = interaction.options.getString("message_id");

    if (messageId) {
      // Show AI response parts for specific message
      const aiParts = await database.getAIResponsePartsByMessageId(messageId);

      if (aiParts.length === 0) {
        await interaction.reply({
          content: `No AI response parts found for message ID: ${messageId}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`AI Response Parts for Message ${messageId}`)
        .setColor(0x0099ff)
        .setTimestamp();

      aiParts.forEach((part, index) => {
        let fieldValue = `**Type:** ${part.type}\n**Order:** ${part.order}\n**Timestamp:** ${part.timestamp}`;

        if (part.toolName) {
          fieldValue += `\n**Tool:** ${part.toolName}`;
        }

        if (part.toolArgs) {
          fieldValue += `\n**Args:** \`${JSON.stringify(part.toolArgs).slice(0, 100)}${JSON.stringify(part.toolArgs).length > 100 ? "..." : ""}\``;
        }

        if (part.content) {
          fieldValue += `\n**Content:** ${part.content.slice(0, 200)}${part.content.length > 200 ? "..." : ""}`;
        }

        embed.addFields({
          name: `Part ${index + 1} (${part.type})`,
          value: fieldValue,
          inline: false,
        });
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } else {
      // Show general context info
      const channelId = interaction.channel?.id;
      if (!channelId) {
        await interaction.reply({
          content: "Could not determine channel ID",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const conversationMessages =
        await database.getConversationMessagesByChannel(channelId, 10);
      const allAIParts = await database.getAllAIResponseParts();
      const channelAIParts = allAIParts.filter((part) =>
        conversationMessages.some((msg) => msg.id === part.messageId),
      );

      const embed = new EmbedBuilder()
        .setTitle("Conversation Context Information")
        .setColor(0x0099ff)
        .setTimestamp()
        .addFields(
          {
            name: "Recent Messages in Database",
            value: `${conversationMessages.length} messages stored`,
            inline: true,
          },
          {
            name: "AI Response Parts",
            value: `${channelAIParts.length} parts stored for this channel`,
            inline: true,
          },
          {
            name: "Tool Calls",
            value: `${channelAIParts.filter((part) => part.type === "tool_call").length} tool calls recorded`,
            inline: true,
          },
        );

      if (conversationMessages.length > 0) {
        const recentMessages = conversationMessages.slice(-5);
        const messageList = recentMessages
          .map((msg) => {
            const author = msg.isBot ? "🤖 Bot" : "👤 User";
            const content =
              msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "");
            return `${author}: ${content}`;
          })
          .join("\n");

        embed.addFields({
          name: "Recent Messages",
          value: messageList || "No recent messages",
          inline: false,
        });
      }

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
