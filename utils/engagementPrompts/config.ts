import { promises as fs } from "fs";
import path from "path";
import { logger } from "../logger";

const CONFIG_PATH = path.join(process.cwd(), "data", "engagement_prompts", "config.json");

export interface EngagementPromptConfig {
  guildId: string;
  channelId: string;
  intervalHours: number;
  extraContext: string;
  enabled: boolean;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
  lastPostedAt: number | null;
  nextRunAt: number | null;
}

interface EngagementPromptConfigStore {
  guilds: Record<string, EngagementPromptConfig>;
}

const DEFAULT_STORE: EngagementPromptConfigStore = {
  guilds: {},
};

class EngagementPromptConfigManager {
  private store: EngagementPromptConfigStore = DEFAULT_STORE;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });

      try {
        const content = await fs.readFile(CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(content) as Partial<EngagementPromptConfigStore>;
        this.store = {
          guilds: parsed.guilds ?? {},
        };
      } catch {
        await this.save();
      }

      this.initialized = true;
      logger.debug("[EngagementPrompts] Config initialized");
    } catch (error) {
      logger.error(`Failed to initialize engagement prompt config: ${error}`);
      this.store = DEFAULT_STORE;
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(this.store, null, 2));
    } catch (error) {
      logger.error(`Failed to save engagement prompt config: ${error}`);
    }
  }

  async get(guildId: string): Promise<EngagementPromptConfig | null> {
    if (!this.initialized) await this.initialize();

    const config = this.store.guilds[guildId];
    return config ? { ...config } : null;
  }

  async getAll(): Promise<EngagementPromptConfig[]> {
    if (!this.initialized) await this.initialize();

    return Object.values(this.store.guilds).map((config) => ({ ...config }));
  }

  async set(config: EngagementPromptConfig): Promise<void> {
    if (!this.initialized) await this.initialize();

    this.store.guilds[config.guildId] = { ...config };
    await this.save();
  }
}

export const engagementPromptConfig = new EngagementPromptConfigManager();
