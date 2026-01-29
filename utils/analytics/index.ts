import { randomUUID } from "crypto";
import { analyticsConfig } from "./config";
import { AnalyticsStorage } from "./storage";
import type { AIAnalytics, CommandAnalytics, EventAnalytics, MessageAnalytics } from "./types";
import { logger } from "../logger";

class AnalyticsManager {
  private commandStorage = new AnalyticsStorage("commands");
  private eventStorage = new AnalyticsStorage("events");
  private messageStorage = new AnalyticsStorage("messages");
  private aiStorage = new AnalyticsStorage("ai");
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await analyticsConfig.initialize();
      await this.commandStorage.initialize();
      await this.eventStorage.initialize();
      await this.messageStorage.initialize();
      await this.aiStorage.initialize();

      this.initialized = true;
      logger.success("[Analytics] System initialized");

      const config = analyticsConfig.get();
      if (config.pruneOnStartup) {
        this.schedulePruning();
      }
    } catch (error) {
      logger.error(`Failed to initialize analytics: ${error}`);
    }
  }

  private schedulePruning(): void {
    const runPruning = async () => {
      const config = analyticsConfig.get();
      logger.debug("[Analytics] Running scheduled pruning...");

      await this.commandStorage.prune(config.retentionDays.commands);
      await this.eventStorage.prune(config.retentionDays.events);
      await this.messageStorage.prune(config.retentionDays.messages);
      await this.aiStorage.prune(config.retentionDays.ai);
    };

    const config = analyticsConfig.get();
    const intervalMs =
      config.pruneInterval === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    // Schedule first run at next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      runPruning();
      setInterval(runPruning, intervalMs);
    }, msUntilMidnight);

    logger.debug(
      `[Analytics] Pruning scheduled for ${(msUntilMidnight / 1000 / 60).toFixed(1)} minutes from now`,
    );
  }

  async trackCommand(data: Omit<CommandAnalytics, "id" | "timestamp">): Promise<void> {
    if (!this.initialized) await this.initialize();

    const analytics: CommandAnalytics = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...data,
    };

    await this.commandStorage.save(analytics, data.commandName);
  }

  async trackEvent(data: Omit<EventAnalytics, "id" | "timestamp">): Promise<void> {
    if (!this.initialized) await this.initialize();

    const analytics: EventAnalytics = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...data,
    };

    await this.eventStorage.save(analytics, data.eventName);
  }

  async trackMessage(data: Omit<MessageAnalytics, "id" | "timestamp">): Promise<void> {
    if (!this.initialized) await this.initialize();

    const analytics: MessageAnalytics = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...data,
    };

    await this.messageStorage.save(analytics, data.isDM ? "dm" : "guild");
  }

  async trackAI(data: Omit<AIAnalytics, "id" | "timestamp">): Promise<void> {
    if (!this.initialized) await this.initialize();

    const analytics: AIAnalytics = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...data,
    };

    await this.aiStorage.save(analytics, data.modelUsed);
  }

  async getCommandsByDate(date: string): Promise<CommandAnalytics[]> {
    if (!this.initialized) await this.initialize();
    return this.commandStorage.getByDate<CommandAnalytics>(date);
  }

  async getCommandsByType(commandName: string): Promise<CommandAnalytics[]> {
    if (!this.initialized) await this.initialize();
    return this.commandStorage.getByType<CommandAnalytics>(commandName);
  }

  async getEventsByDate(date: string): Promise<EventAnalytics[]> {
    if (!this.initialized) await this.initialize();
    return this.eventStorage.getByDate<EventAnalytics>(date);
  }

  async getEventsByType(eventName: string): Promise<EventAnalytics[]> {
    if (!this.initialized) await this.initialize();
    return this.eventStorage.getByType<EventAnalytics>(eventName);
  }

  async getMessagesByDate(date: string): Promise<MessageAnalytics[]> {
    if (!this.initialized) await this.initialize();
    return this.messageStorage.getByDate<MessageAnalytics>(date);
  }

  async getAIByDate(date: string): Promise<AIAnalytics[]> {
    if (!this.initialized) await this.initialize();
    return this.aiStorage.getByDate<AIAnalytics>(date);
  }

  async getStats(): Promise<{
    commands: any;
    events: any;
    messages: any;
    ai: any;
  }> {
    if (!this.initialized) await this.initialize();

    const [commands, events, messages, ai] = await Promise.all([
      this.commandStorage.getIndex(),
      this.eventStorage.getIndex(),
      this.messageStorage.getIndex(),
      this.aiStorage.getIndex(),
    ]);

    return { commands, events, messages, ai };
  }
}

export const analytics = new AnalyticsManager();
