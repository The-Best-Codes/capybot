import { promises as fs } from "fs";
import path from "path";
import { logger } from "../logger";
import { analyticsConfig } from "./config";
import type { DailyIndex, IndexMetadata } from "./types";

const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");

export class AnalyticsStorage {
  private category: string;
  private basePath: string;
  private initialized = false;

  constructor(category: "commands" | "events" | "messages" | "ai") {
    this.category = category;
    this.basePath = path.join(ANALYTICS_DIR, category);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(path.join(this.basePath, "by-date"), { recursive: true });
      await fs.mkdir(path.join(this.basePath, "by-type"), { recursive: true });
      this.initialized = true;
      logger.debug(`[Analytics] Storage initialized for ${this.category}`);
    } catch (error) {
      logger.error(
        `Failed to initialize analytics storage for ${this.category}: ${error}`,
      );
    }
  }

  async save<T extends { id: string; timestamp: number }>(
    data: T,
    type: string,
  ): Promise<void> {
    if (!this.initialized) await this.initialize();

    const config = analyticsConfig.get();
    if (!config.enabled) return;

    try {
      const date = new Date(data.timestamp).toISOString().split("T")[0];

      // Save to by-date file
      await this.appendToDateFile(date, data);

      // Save to by-type file
      await this.appendToTypeFile(type, data);

      // Update indexes
      await this.updateIndex(date, type);
    } catch (error) {
      logger.error(`Failed to save analytics for ${this.category}: ${error}`);
    }
  }

  private async appendToDateFile<T>(date: string, data: T): Promise<void> {
    const filePath = path.join(this.basePath, "by-date", `${date}.json`);

    let records: T[] = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      records = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }

    records.push(data);
    await fs.writeFile(filePath, JSON.stringify(records, null, 2));
  }

  private async appendToTypeFile<T>(type: string, data: T): Promise<void> {
    const filePath = path.join(
      this.basePath,
      "by-type",
      `${type.replace(/[^a-z0-9-_]/gi, "_")}.json`,
    );

    let records: T[] = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      records = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }

    records.push(data);
    await fs.writeFile(filePath, JSON.stringify(records, null, 2));
  }

  private async updateIndex(date: string, type: string): Promise<void> {
    const indexPath = path.join(this.basePath, "index.json");

    let index: IndexMetadata;
    try {
      const content = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(content);
    } catch {
      index = {
        totalRecords: 0,
        dateRange: { start: date, end: date },
        lastUpdated: Date.now(),
        categories: {},
      };
    }

    index.totalRecords++;
    index.lastUpdated = Date.now();
    index.categories = index.categories || {};
    index.categories[type] = (index.categories[type] || 0) + 1;

    if (date < index.dateRange.start) index.dateRange.start = date;
    if (date > index.dateRange.end) index.dateRange.end = date;

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  async getByDate<T>(date: string): Promise<T[]> {
    if (!this.initialized) await this.initialize();

    try {
      const filePath = path.join(this.basePath, "by-date", `${date}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async getByType<T>(type: string): Promise<T[]> {
    if (!this.initialized) await this.initialize();

    try {
      const filePath = path.join(
        this.basePath,
        "by-type",
        `${type.replace(/[^a-z0-9-_]/gi, "_")}.json`,
      );
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async getIndex(): Promise<IndexMetadata | null> {
    if (!this.initialized) await this.initialize();

    try {
      const indexPath = path.join(this.basePath, "index.json");
      const content = await fs.readFile(indexPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async prune(retentionDays: number): Promise<number> {
    if (!this.initialized) await this.initialize();

    try {
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(now - retentionMs)
        .toISOString()
        .split("T")[0];

      let deletedCount = 0;

      // Prune by-date files
      const byDatePath = path.join(this.basePath, "by-date");
      const dateFiles = await fs.readdir(byDatePath);

      for (const file of dateFiles) {
        if (!file.endsWith(".json")) continue;

        const date = file.replace(".json", "");
        if (date < cutoffDate) {
          await fs.unlink(path.join(byDatePath, file));
          deletedCount++;
        }
      }

      // Prune by-type files (remove old entries)
      const byTypePath = path.join(this.basePath, "by-type");
      const typeFiles = await fs.readdir(byTypePath);

      for (const file of typeFiles) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(byTypePath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const records = JSON.parse(content);

        const filtered = records.filter(
          (r: any) => now - r.timestamp <= retentionMs,
        );

        if (filtered.length === 0) {
          await fs.unlink(filePath);
        } else if (filtered.length < records.length) {
          await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
        }
      }

      logger.debug(
        `[Analytics] Pruned ${deletedCount} old files from ${this.category}`,
      );
      return deletedCount;
    } catch (error) {
      logger.error(`Failed to prune analytics for ${this.category}: ${error}`);
      return 0;
    }
  }
}
