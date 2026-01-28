import { promises as fs } from "fs";
import path from "path";
import { logger } from "../logger";

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  output?: Record<string, any> | null;
  isError?: boolean;
  error?: string;
  stepNumber: number;
  timestamp: number; // milliseconds since epoch
  executionTime?: number; // milliseconds
}

const DATA_DIR = path.join(process.cwd(), "data", "tool_calls");
const RETENTION_DAYS = 30;

class ToolCallStore {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      this.initialized = true;
      this.scheduleCleanup();
    } catch (error) {
      logger.error(`Failed to initialize tool calls database: ${error}`);
    }
  }

  async save(messageId: string, toolCalls: ToolCall[]): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (toolCalls.length === 0) return;

    try {
      const filePath = path.join(DATA_DIR, `${messageId}.json`);
      const data = {
        messageId,
        toolCalls,
        savedAt: new Date().toISOString(),
      };
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`Failed to save tool calls for message ${messageId}: ${error}`);
    }
  }

  async get(messageId: string): Promise<ToolCall[]> {
    if (!this.initialized) await this.initialize();

    try {
      const filePath = path.join(DATA_DIR, `${messageId}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      return data.toolCalls || [];
    } catch (error) {
      return [];
    }
  }

  private scheduleCleanup(): void {
    const runCleanup = async () => {
      try {
        await this.cleanup();
      } catch (error) {
        logger.error(`Tool calls cleanup failed: ${error}`);
      }
    };

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      runCleanup();
      setInterval(runCleanup, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    logger.debug(
      `[toolCallsDb] Cleanup scheduled for ${(msUntilMidnight / 1000 / 60).toFixed(1)} minutes from now`,
    );
  }

  private async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(DATA_DIR);
      const now = Date.now();
      const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(DATA_DIR, file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const data = JSON.parse(content);

          const hasExpired = data.toolCalls.some(
            (tc: ToolCall) => now - tc.timestamp > retentionMs,
          );

          if (hasExpired) {
            const filtered = data.toolCalls.filter(
              (tc: ToolCall) => now - tc.timestamp <= retentionMs,
            );

            if (filtered.length === 0) {
              await fs.unlink(filePath);
              deletedCount++;
            } else {
              data.toolCalls = filtered;
              await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            }
          }
        } catch (error) {
          logger.error(`Error processing tool calls file ${file}: ${error}`);
        }
      }

      if (deletedCount > 0) {
        logger.debug(
          `[toolCallsDb] Cleanup complete: deleted ${deletedCount} expired tool call records`,
        );
      }
    } catch (error) {
      logger.error(`Failed to cleanup tool calls: ${error}`);
    }
  }
}

export const toolCallStore = new ToolCallStore();
