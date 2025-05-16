import {
  Client,
  Events,
  Message,
  MessageFlags,
  TextChannel,
  type Interaction,
} from "discord.js";
import { storeFeedback } from "../utils/feedbackStorage";
import { logger } from "../utils/logger";

export default {
  event: Events.InteractionCreate,
  handler: async (client: Client, interaction: Interaction) => {
    // Only handle button interactions
    if (!interaction.isButton()) return;

    // Check if this is our feedback button
    if (
      interaction.customId.startsWith("thumbsup_") ||
      interaction.customId.startsWith("thumbsdown_")
    ) {
      try {
        const [action, messageId] = interaction.customId.split("_");
        const isPositive = action === "thumbsup";

        // Fetch surrounding messages for context (5 messages)
        let surroundingMessages: Message[] = [];
        if (interaction.channel instanceof TextChannel) {
          const messages = await interaction.channel.messages.fetch({
            limit: 10,
            around: messageId,
          });
          surroundingMessages = Array.from(messages.values());
        }

        logger.info(
          `${isPositive ? "Positive" : "Negative"} feedback from ${interaction.user.username} (${interaction.user.id}) for message ${messageId}`,
        );

        // Store feedback with surrounding messages
        await storeFeedback(
          messageId,
          isPositive,
          interaction.user.id,
          surroundingMessages,
        );

        await interaction.reply({
          content: isPositive
            ? "Thanks for the feedback! Glad I joined the conversation."
            : "Thanks for the feedback! I'll try to be more selective next time.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        logger.error(`Error handling button interaction: ${error}`);
        await interaction.reply({
          content: "Something went wrong processing your feedback.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
