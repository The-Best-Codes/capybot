import { analytics } from "./index";
import type {
  AIAnalytics,
  CommandAnalytics,
  EventAnalytics,
  MessageAnalytics,
  ToolUsageAnalytics,
} from "./types";

/**
 * Query utilities for analytics data
 */
export class AnalyticsQueries {
  /**
   * Get command statistics for a date range
   */
  static async getCommandStats(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalCommands: number;
    successRate: number;
    byCommand: Record<string, { count: number; successRate: number }>;
    avgExecutionTime: number;
  }> {
    const dates = this.getDateRange(startDate, endDate);
    const allCommands: CommandAnalytics[] = [];

    for (const date of dates) {
      const data = await analytics.getCommandsByDate(date);
      allCommands.push(...data);
    }

    const totalCommands = allCommands.length;
    const successCount = allCommands.filter((c) => c.success).length;
    const successRate = totalCommands > 0 ? successCount / totalCommands : 0;

    const byCommand: Record<string, { count: number; successRate: number }> =
      {};
    allCommands.forEach((cmd) => {
      if (!byCommand[cmd.commandName]) {
        byCommand[cmd.commandName] = { count: 0, successRate: 0 };
      }
      byCommand[cmd.commandName].count++;
    });

    Object.keys(byCommand).forEach((cmdName) => {
      const cmdData = allCommands.filter((c) => c.commandName === cmdName);
      const cmdSuccess = cmdData.filter((c) => c.success).length;
      byCommand[cmdName].successRate = cmdSuccess / cmdData.length;
    });

    const executionTimes = allCommands
      .filter((c) => c.executionTime !== undefined)
      .map((c) => c.executionTime!);
    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;

    return {
      totalCommands,
      successRate,
      byCommand,
      avgExecutionTime,
    };
  }

  /**
   * Get message processing statistics
   */
  static async getMessageStats(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalMessages: number;
    processed: number;
    responseGenerated: number;
    byReason: Record<string, number>;
    avgResponseTime: number;
  }> {
    const dates = this.getDateRange(startDate, endDate);
    const allMessages: MessageAnalytics[] = [];

    for (const date of dates) {
      const data = await analytics.getMessagesByDate(date);
      allMessages.push(...data);
    }

    const totalMessages = allMessages.length;
    const processed = allMessages.filter((m) => m.responseGenerated).length;
    const responseGenerated = processed;

    const byReason: Record<string, number> = {};
    allMessages.forEach((msg) => {
      byReason[msg.processReason] = (byReason[msg.processReason] || 0) + 1;
    });

    const responseTimes = allMessages
      .filter((m) => m.responseTime !== undefined)
      .map((m) => m.responseTime!);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    return {
      totalMessages,
      processed,
      responseGenerated,
      byReason,
      avgResponseTime,
    };
  }

  /**
   * Get AI usage statistics
   */
  static async getAIStats(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalGenerations: number;
    successRate: number;
    avgGenerationTime: number;
    toolUsage: ToolUsageAnalytics[];
    totalTokens: number;
    byModel: Record<string, number>;
  }> {
    const dates = this.getDateRange(startDate, endDate);
    const allAI: AIAnalytics[] = [];

    for (const date of dates) {
      const data = await analytics.getAIByDate(date);
      allAI.push(...data);
    }

    const totalGenerations = allAI.length;
    const successCount = allAI.filter((ai) => ai.success).length;
    const successRate =
      totalGenerations > 0 ? successCount / totalGenerations : 0;

    const generationTimes = allAI.map((ai) => ai.generationTime);
    const avgGenerationTime =
      generationTimes.length > 0
        ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length
        : 0;

    const toolUsageMap = new Map<string, ToolUsageAnalytics>();
    allAI.forEach((ai) => {
      ai.toolsUsed.forEach((tool) => {
        if (!toolUsageMap.has(tool)) {
          toolUsageMap.set(tool, {
            toolName: tool,
            callCount: 0,
            successCount: 0,
            errorCount: 0,
            lastUsed: 0,
          });
        }
        const usage = toolUsageMap.get(tool)!;
        usage.callCount++;
        if (ai.success) usage.successCount++;
        else usage.errorCount++;
        usage.lastUsed = Math.max(usage.lastUsed, ai.timestamp);
      });
    });

    const toolUsage = Array.from(toolUsageMap.values());

    const totalTokens = allAI.reduce(
      (sum, ai) => sum + (ai.totalTokens || 0),
      0,
    );

    const byModel: Record<string, number> = {};
    allAI.forEach((ai) => {
      byModel[ai.modelUsed] = (byModel[ai.modelUsed] || 0) + 1;
    });

    return {
      totalGenerations,
      successRate,
      avgGenerationTime,
      toolUsage,
      totalTokens,
      byModel,
    };
  }

  /**
   * Get event statistics
   */
  static async getEventStats(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalEvents: number;
    byEvent: Record<string, number>;
  }> {
    const dates = this.getDateRange(startDate, endDate);
    const allEvents: EventAnalytics[] = [];

    for (const date of dates) {
      const data = await analytics.getEventsByDate(date);
      allEvents.push(...data);
    }

    const totalEvents = allEvents.length;
    const byEvent: Record<string, number> = {};
    allEvents.forEach((evt) => {
      byEvent[evt.eventName] = (byEvent[evt.eventName] || 0) + 1;
    });

    return {
      totalEvents,
      byEvent,
    };
  }

  /**
   * Get top users by activity
   */
  static async getTopUsers(
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<
    Array<{ userId: string; messageCount: number; commandCount: number }>
  > {
    const dates = this.getDateRange(startDate, endDate);
    const userActivity = new Map<
      string,
      { messageCount: number; commandCount: number }
    >();

    for (const date of dates) {
      const messages = await analytics.getMessagesByDate(date);
      const commands = await analytics.getCommandsByDate(date);

      messages.forEach((msg) => {
        if (!userActivity.has(msg.userId)) {
          userActivity.set(msg.userId, { messageCount: 0, commandCount: 0 });
        }
        userActivity.get(msg.userId)!.messageCount++;
      });

      commands.forEach((cmd) => {
        if (!userActivity.has(cmd.userId)) {
          userActivity.set(cmd.userId, { messageCount: 0, commandCount: 0 });
        }
        userActivity.get(cmd.userId)!.commandCount++;
      });
    }

    return Array.from(userActivity.entries())
      .map(([userId, activity]) => ({ userId, ...activity }))
      .sort(
        (a, b) =>
          b.messageCount + b.commandCount - (a.messageCount + a.commandCount),
      )
      .slice(0, limit);
  }

  /**
   * Helper to generate date range
   */
  private static getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  static getToday(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Get date N days ago in YYYY-MM-DD format
   */
  static getDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  }
}
