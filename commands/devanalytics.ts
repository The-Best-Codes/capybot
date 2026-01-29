import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { AnalyticsQueries } from "../utils/analytics/queries";
import { requireDevAuth } from "../utils/auth/devCommandGuard";

export default {
  data: new SlashCommandBuilder()
    .setName("dev_analytics")
    .setDescription("View bot analytics and statistics")
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Time period to analyze")
        .addChoices(
          { name: "Today", value: "today" },
          { name: "Last 7 days", value: "7days" },
          { name: "Last 30 days", value: "30days" },
          { name: "Last 90 days", value: "90days" },
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Category to view")
        .addChoices(
          { name: "Overview", value: "overview" },
          { name: "Commands", value: "commands" },
          { name: "Messages", value: "messages" },
          { name: "AI Usage", value: "ai" },
          { name: "Events", value: "events" },
          { name: "Top Users", value: "users" },
        )
        .setRequired(false),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    const isAuthed = await requireDevAuth(interaction);
    if (!isAuthed) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const period = interaction.options.getString("period") || "7days";
    const category = interaction.options.getString("category") || "overview";

    let startDate: string;
    const endDate = AnalyticsQueries.getToday();

    switch (period) {
      case "today":
        startDate = endDate;
        break;
      case "7days":
        startDate = AnalyticsQueries.getDaysAgo(7);
        break;
      case "30days":
        startDate = AnalyticsQueries.getDaysAgo(30);
        break;
      case "90days":
        startDate = AnalyticsQueries.getDaysAgo(90);
        break;
      default:
        startDate = AnalyticsQueries.getDaysAgo(7);
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle("CapyBot Analytics")
        .setColor(0x5865f2)
        .setTimestamp();

      if (category === "overview") {
        const [commandStats, messageStats, aiStats, eventStats] = await Promise.all([
          AnalyticsQueries.getCommandStats(startDate, endDate),
          AnalyticsQueries.getMessageStats(startDate, endDate),
          AnalyticsQueries.getAIStats(startDate, endDate),
          AnalyticsQueries.getEventStats(startDate, endDate),
        ]);

        embed.setDescription(
          `Analytics overview for **${period === "today" ? "today" : `the last ${period.replace("days", " days")}`}**`,
        );

        embed.addFields(
          {
            name: "Commands",
            value: `Total: ${commandStats.totalCommands}\nSuccess Rate: ${(commandStats.successRate * 100).toFixed(1)}%\nAvg Time: ${commandStats.avgExecutionTime.toFixed(0)}ms`,
            inline: true,
          },
          {
            name: "Messages",
            value: `Total: ${messageStats.totalMessages}\nProcessed: ${messageStats.processed}\nAvg Response: ${(messageStats.avgResponseTime / 1000).toFixed(1)}s`,
            inline: true,
          },
          {
            name: "AI",
            value: `Generations: ${aiStats.totalGenerations}\nSuccess Rate: ${(aiStats.successRate * 100).toFixed(1)}%\nAvg Time: ${(aiStats.avgGenerationTime / 1000).toFixed(1)}s`,
            inline: true,
          },
          {
            name: "Events",
            value: `Total Events: ${eventStats.totalEvents}`,
            inline: true,
          },
          {
            name: "Tokens Used",
            value: aiStats.totalTokens.toLocaleString(),
            inline: true,
          },
        );
      } else if (category === "commands") {
        const stats = await AnalyticsQueries.getCommandStats(startDate, endDate);

        embed.setDescription(`Command statistics`);
        embed.addFields({
          name: "Summary",
          value: `Total Commands: ${stats.totalCommands}\nSuccess Rate: ${(stats.successRate * 100).toFixed(1)}%\nAvg Execution Time: ${stats.avgExecutionTime.toFixed(0)}ms`,
        });

        const topCommands = Object.entries(stats.byCommand)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10);

        if (topCommands.length > 0) {
          embed.addFields({
            name: "Top Commands",
            value: topCommands
              .map(
                ([cmd, data]) =>
                  `\`${cmd}\`: ${data.count} (${(data.successRate * 100).toFixed(0)}% success)`,
              )
              .join("\n"),
          });
        }
      } else if (category === "messages") {
        const stats = await AnalyticsQueries.getMessageStats(startDate, endDate);

        embed.setDescription(`Message processing statistics`);
        embed.addFields(
          {
            name: "Summary",
            value: `Total Messages: ${stats.totalMessages}\nProcessed: ${stats.processed}\nResponse Rate: ${((stats.responseGenerated / stats.totalMessages) * 100).toFixed(1)}%\nAvg Response Time: ${(stats.avgResponseTime / 1000).toFixed(1)}s`,
          },
          {
            name: "By Reason",
            value: Object.entries(stats.byReason)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([reason, count]) => `\`${reason}\`: ${count}`)
              .join("\n"),
          },
        );
      } else if (category === "ai") {
        const stats = await AnalyticsQueries.getAIStats(startDate, endDate);

        embed.setDescription(`AI usage statistics`);
        embed.addFields(
          {
            name: "Summary",
            value: `Total Generations: ${stats.totalGenerations}\nSuccess Rate: ${(stats.successRate * 100).toFixed(1)}%\nAvg Generation Time: ${(stats.avgGenerationTime / 1000).toFixed(1)}s\nTotal Tokens: ${stats.totalTokens.toLocaleString()}`,
          },
          {
            name: "Models Used",
            value:
              Object.entries(stats.byModel)
                .map(([model, count]) => `\`${model}\`: ${count}`)
                .join("\n") || "No data",
          },
        );

        if (stats.toolUsage.length > 0) {
          const topTools = stats.toolUsage.sort((a, b) => b.callCount - a.callCount).slice(0, 10);

          embed.addFields({
            name: "Tool Usage",
            value: topTools
              .map(
                (tool) =>
                  `\`${tool.toolName}\`: ${tool.callCount} calls (${tool.successCount} success, ${tool.errorCount} errors)`,
              )
              .join("\n"),
          });
        }
      } else if (category === "events") {
        const stats = await AnalyticsQueries.getEventStats(startDate, endDate);

        embed.setDescription(`Event statistics`);
        embed.addFields({
          name: "Total Events",
          value: stats.totalEvents.toString(),
        });

        const topEvents = Object.entries(stats.byEvent)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);

        if (topEvents.length > 0) {
          embed.addFields({
            name: "By Event Type",
            value: topEvents.map(([event, count]) => `\`${event}\`: ${count}`).join("\n"),
          });
        }
      } else if (category === "users") {
        const topUsers = await AnalyticsQueries.getTopUsers(startDate, endDate, 10);

        embed.setDescription(`Top active users`);

        if (topUsers.length > 0) {
          embed.addFields({
            name: "Most Active",
            value: topUsers
              .map(
                (user, idx) =>
                  `${idx + 1}. <@${user.userId}>: ${user.messageCount} msgs, ${user.commandCount} cmds`,
              )
              .join("\n"),
          });
        } else {
          embed.setDescription("No user activity data available");
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(
        `Failed to fetch analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
