import { promises as fs } from "fs";
import path from "path";
import { logger } from "../logger";
import type { AnalyticsConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "analytics", "config.json");

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  retentionDays: {
    commands: 90,
    events: 60,
    messages: 90,
    ai: 90,
  },
  pruneOnStartup: true,
  pruneInterval: "daily",
  anonymizeUserData: false,
};

class ConfigManager {
  private config: AnalyticsConfig = DEFAULT_CONFIG;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });

      try {
        const content = await fs.readFile(CONFIG_PATH, "utf-8");
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };
      } catch {
        await this.save();
      }

      this.initialized = true;
      logger.debug("[Analytics] Config initialized");
    } catch (error) {
      logger.error(`Failed to initialize analytics config: ${error}`);
      this.config = DEFAULT_CONFIG;
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (error) {
      logger.error(`Failed to save analytics config: ${error}`);
    }
  }

  get(): AnalyticsConfig {
    return { ...this.config };
  }

  async update(updates: Partial<AnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.save();
  }

  async setRetentionDays(
    category: keyof AnalyticsConfig["retentionDays"],
    days: number,
  ): Promise<void> {
    this.config.retentionDays[category] = days;
    await this.save();
  }
}

export const analyticsConfig = new ConfigManager();
