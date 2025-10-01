import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { logger } from "./logger";

// Helper function to safely parse JSON data
function safeJsonParse(
  jsonString: string | null,
  fallback: any = undefined,
): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Failed to parse JSON data:`, error);
    return fallback;
  }
}

export interface AIResponsePart {
  id: string;
  messageId: string;
  type: "text" | "tool_call" | "tool_response";
  content: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  timestamp: string;
  order: number;
}

export interface ConversationMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  timestamp: string;
  isBot: boolean;
  replyToMessageId?: string;
  aiResponseParts?: AIResponsePart[];
}

export interface IgnoreRule {
  id?: number;
  guildId: string;
  userId?: string;
  channelId?: string;
  scope: "server" | "channel_specific";
  createdAt?: string;
}

class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    this.dbPath = path.join(dataDir, "context.db");

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        logger.error("Error opening database:", err);
      } else {
        logger.info("Connected to SQLite database");
        this.initializeTables();
      }
    });
  }

  private initializeTables(): void {
    const createAIResponsePartsTable = `
      CREATE TABLE IF NOT EXISTS ai_response_parts (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        tool_name TEXT,
        tool_args TEXT,
        tool_result TEXT,
        timestamp TEXT NOT NULL,
        order_num INTEGER NOT NULL
      )
    `;

    const createConversationMessagesTable = `
       CREATE TABLE IF NOT EXISTS conversation_messages (
         id TEXT PRIMARY KEY,
         channel_id TEXT NOT NULL,
         author_id TEXT NOT NULL,
         content TEXT,
         timestamp TEXT NOT NULL,
         is_bot INTEGER NOT NULL,
         reply_to_message_id TEXT
       )
     `;

    const createIgnoreRulesTable = `
       CREATE TABLE IF NOT EXISTS ignore_rules (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         guild_id TEXT NOT NULL,
         user_id TEXT,
         channel_id TEXT,
         scope TEXT NOT NULL CHECK (scope IN ('server', 'channel_specific')),
         created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
         UNIQUE(guild_id, user_id, channel_id, scope)
       )
     `;

    this.db.serialize(() => {
      this.db.run(createAIResponsePartsTable);
      this.db.run(createConversationMessagesTable);
      this.db.run(createIgnoreRulesTable);

      // Create indexes for better performance
      this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_ai_parts_message_id ON ai_response_parts(message_id)",
      );
      this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON conversation_messages(channel_id)",
      );
      this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON conversation_messages(timestamp)",
      );
      this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_ignore_rules_guild_id ON ignore_rules(guild_id)",
      );
    });
  }

  // AI Response Parts methods
  saveAIResponsePart(part: AIResponsePart): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO ai_response_parts
        (id, message_id, type, content, tool_name, tool_args, tool_result, timestamp, order_num)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        [
          part.id,
          part.messageId,
          part.type,
          part.content,
          part.toolName || null,
          part.toolArgs ? JSON.stringify(part.toolArgs) : null,
          part.toolResult ? JSON.stringify(part.toolResult) : null,
          part.timestamp,
          part.order,
        ],
        (err) => {
          if (err) {
            logger.error("Error saving AI response part:", err);
            reject(err);
          } else {
            resolve();
          }
        },
      );

      stmt.finalize();
    });
  }

  getAIResponsePartsByMessageId(messageId: string): Promise<AIResponsePart[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM ai_response_parts WHERE message_id = ? ORDER BY order_num ASC",
        [messageId],
        (err, rows: any[]) => {
          if (err) {
            logger.error("Error getting AI response parts:", err);
            reject(err);
          } else {
            const parts: AIResponsePart[] = rows.map((row) => ({
              id: row.id,
              messageId: row.message_id,
              type: row.type,
              content: row.content,
              toolName: row.tool_name,
              toolArgs: safeJsonParse(row.tool_args),
              toolResult: safeJsonParse(row.tool_result),
              timestamp: row.timestamp,
              order: row.order_num,
            }));
            resolve(parts);
          }
        },
      );
    });
  }

  getAllAIResponseParts(): Promise<AIResponsePart[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM ai_response_parts ORDER BY timestamp DESC",
        [],
        (err, rows: any[]) => {
          if (err) {
            logger.error("Error getting all AI response parts:", err);
            reject(err);
          } else {
            const parts: AIResponsePart[] = rows.map((row) => ({
              id: row.id,
              messageId: row.message_id,
              type: row.type,
              content: row.content,
              toolName: row.tool_name,
              toolArgs: safeJsonParse(row.tool_args),
              toolResult: safeJsonParse(row.tool_result),
              timestamp: row.timestamp,
              order: row.order_num,
            }));
            resolve(parts);
          }
        },
      );
    });
  }

  deleteAIResponsePartsByMessageId(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM ai_response_parts WHERE message_id = ?",
        [messageId],
        (err) => {
          if (err) {
            logger.error(
              `Error deleting AI response parts for messageId ${messageId}:`,
              err,
            );
            reject(err);
          } else {
            logger.info(
              `Successfully deleted AI response parts for messageId: ${messageId}`,
            );
            resolve();
          }
        },
      );
    });
  }

  // Conversation Messages methods
  saveConversationMessage(message: ConversationMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO conversation_messages
        (id, channel_id, author_id, content, timestamp, is_bot, reply_to_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        [
          message.id,
          message.channelId,
          message.authorId,
          message.content,
          message.timestamp,
          message.isBot ? 1 : 0,
          message.replyToMessageId || null,
        ],
        (err) => {
          if (err) {
            logger.error("Error saving conversation message:", err);
            reject(err);
          } else {
            resolve();
          }
        },
      );

      stmt.finalize();
    });
  }

  getConversationMessage(
    messageId: string,
  ): Promise<ConversationMessage | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM conversation_messages WHERE id = ?",
        [messageId],
        (err, row: any) => {
          if (err) {
            logger.error("Error getting conversation message:", err);
            reject(err);
          } else if (row) {
            const message: ConversationMessage = {
              id: row.id,
              channelId: row.channel_id,
              authorId: row.author_id,
              content: row.content,
              timestamp: row.timestamp,
              isBot: row.is_bot === 1,
              replyToMessageId: row.reply_to_message_id,
            };
            resolve(message);
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  getConversationMessagesByChannel(
    channelId: string,
    limit: number = 50,
  ): Promise<ConversationMessage[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM conversation_messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?",
        [channelId, limit],
        (err, rows: any[]) => {
          if (err) {
            logger.error(
              "Error getting conversation messages by channel:",
              err,
            );
            reject(err);
          } else {
            const messages: ConversationMessage[] = rows
              .map((row) => ({
                id: row.id,
                channelId: row.channel_id,
                authorId: row.author_id,
                content: row.content,
                timestamp: row.timestamp,
                isBot: row.is_bot === 1,
                replyToMessageId: row.reply_to_message_id,
              }))
              .reverse(); // Return in chronological order
            resolve(messages);
          }
        },
      );
    });
  }

  // Cleanup old data (optional, for performance)
  cleanupOldData(daysToKeep: number = 30): Promise<void> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = cutoffDate.toISOString();

      this.db.serialize(() => {
        this.db.run(
          "DELETE FROM ai_response_parts WHERE timestamp < ?",
          [cutoffTimestamp],
          (err) => {
            if (err) {
              logger.error("Error cleaning up AI response parts:", err);
              reject(err);
              return;
            }
          },
        );

        this.db.run(
          "DELETE FROM conversation_messages WHERE timestamp < ?",
          [cutoffTimestamp],
          (err) => {
            if (err) {
              logger.error("Error cleaning up conversation messages:", err);
              reject(err);
              return;
            }
            logger.info(`Cleaned up data older than ${daysToKeep} days`);
            resolve();
          },
        );
      });
    });
  }

  // Ignore Rules methods
  saveIgnoreRule(rule: IgnoreRule): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
         INSERT OR REPLACE INTO ignore_rules (guild_id, user_id, channel_id, scope)
         VALUES (?, ?, ?, ?)
       `);

      stmt.run(
        [rule.guildId, rule.userId || null, rule.channelId || null, rule.scope],
        (err) => {
          if (err) {
            logger.error("Error saving ignore rule:", err);
            reject(err);
          } else {
            resolve();
          }
        },
      );

      stmt.finalize();
    });
  }

  getIgnoreRulesByGuild(guildId: string): Promise<IgnoreRule[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM ignore_rules WHERE guild_id = ? ORDER BY created_at DESC",
        [guildId],
        (err, rows: any[]) => {
          if (err) {
            logger.error("Error getting ignore rules:", err);
            reject(err);
          } else {
            const rules: IgnoreRule[] = rows.map((row) => ({
              id: row.id,
              guildId: row.guild_id,
              userId: row.user_id,
              channelId: row.channel_id,
              scope: row.scope,
              createdAt: row.created_at,
            }));
            resolve(rules);
          }
        },
      );
    });
  }

  deleteIgnoreRule(
    guildId: string,
    userId?: string,
    channelId?: string,
    scope?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let query = "DELETE FROM ignore_rules WHERE guild_id = ?";
      const params: any[] = [guildId];

      if (userId) {
        query += " AND user_id = ?";
        params.push(userId);
      }
      if (channelId) {
        query += " AND channel_id = ?";
        params.push(channelId);
      }
      if (scope) {
        query += " AND scope = ?";
        params.push(scope);
      }

      this.db.run(query, params, (err) => {
        if (err) {
          logger.error("Error deleting ignore rule:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export const database = new Database();
