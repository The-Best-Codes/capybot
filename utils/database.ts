import path from "path";
import sqlite3 from "sqlite3";
import { logger } from "./logger";

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

class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    this.dbPath = path.join(dataDir, "context.db");

    // Ensure data directory exists
    const fs = require("fs");
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

    this.db.serialize(() => {
      this.db.run(createAIResponsePartsTable);
      this.db.run(createConversationMessagesTable);

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
              toolArgs: row.tool_args ? JSON.parse(row.tool_args) : undefined,
              toolResult: row.tool_result
                ? JSON.parse(row.tool_result)
                : undefined,
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
              toolArgs: row.tool_args ? JSON.parse(row.tool_args) : undefined,
              toolResult: row.tool_result
                ? JSON.parse(row.tool_result)
                : undefined,
              timestamp: row.timestamp,
              order: row.order_num,
            }));
            resolve(parts);
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
}

export const database = new Database();
