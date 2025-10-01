import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { database, type IgnoreRule } from "../utils/database";
import { logger } from "../utils/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("ignore-status")
    .setDescription("View current ignore rules for this server."),

  handler: async (interaction: any) => {
    if (!interaction.guild) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    try {
      const rules: IgnoreRule[] = await database.getIgnoreRulesByGuild(
        interaction.guild.id,
      );

      if (rules.length === 0) {
        return interaction.reply({
          content: "No ignore rules are currently set for this server.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("Ignore Rules")
        .setDescription("Current ignore rules for this server:")
        .setColor(0x0099ff);

      for (const rule of rules) {
        let description = "";
        if (rule.scope === "server") {
          if (rule.userId) {
            description = `Ignoring user <@${rule.userId}> server-wide.`;
          } else if (rule.channelId) {
            description = `Ignoring channel <#${rule.channelId}> server-wide.`;
          }
        } else if (rule.scope === "channel_specific") {
          description = `Ignoring user <@${rule.userId}> in channel <#${rule.channelId}>.`;
        }
        embed.addFields({ name: "Rule", value: description, inline: false });
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      logger.error("Error getting ignore rules:", error);
      await interaction.reply({
        content: "An error occurred while retrieving ignore rules.",
        ephemeral: true,
      });
    }
  },
};
