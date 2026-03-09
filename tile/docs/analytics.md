# Analytics

CapyBot includes a file-based analytics system for tracking commands, Discord events, message processing, and AI generation. Data is stored in JSON files organized by date and type under `data/analytics/`.

## Capabilities

### Analytics Manager

The `analytics` singleton tracks all bot activity and provides retrieval methods.

```typescript { .api }
// From: utils/analytics/index.ts
// Import: import { analytics } from "./utils/analytics";

class AnalyticsManager {
  /** Initialize the analytics system (auto-called on first use) */
  initialize(): Promise<void>;

  /** Track a slash command execution */
  trackCommand(data: Omit<CommandAnalytics, 'id' | 'timestamp'>): Promise<void>;

  /** Track a Discord event */
  trackEvent(data: Omit<EventAnalytics, 'id' | 'timestamp'>): Promise<void>;

  /** Track a message processing event */
  trackMessage(data: Omit<MessageAnalytics, 'id' | 'timestamp'>): Promise<void>;

  /** Track an AI generation event */
  trackAI(data: Omit<AIAnalytics, 'id' | 'timestamp'>): Promise<void>;

  /** Get all command records for a specific date (YYYY-MM-DD) */
  getCommandsByDate(date: string): Promise<CommandAnalytics[]>;

  /** Get all command records for a specific command name */
  getCommandsByType(commandName: string): Promise<CommandAnalytics[]>;

  /** Get all event records for a specific date (YYYY-MM-DD) */
  getEventsByDate(date: string): Promise<EventAnalytics[]>;

  /** Get all event records for a specific event name */
  getEventsByType(eventName: string): Promise<EventAnalytics[]>;

  /** Get all message records for a specific date (YYYY-MM-DD) */
  getMessagesByDate(date: string): Promise<MessageAnalytics[]>;

  /** Get all AI records for a specific date (YYYY-MM-DD) */
  getAIByDate(date: string): Promise<AIAnalytics[]>;

  /** Get index metadata for all categories */
  getStats(): Promise<{
    commands: IndexMetadata | null;
    events: IndexMetadata | null;
    messages: IndexMetadata | null;
    ai: IndexMetadata | null;
  }>;
}

export const analytics: AnalyticsManager;
```

**Usage example:**

```typescript
import { analytics } from "./utils/analytics";

// Track a command
await analytics.trackCommand({
  commandName: "ping",
  userId: interaction.user.id,
  username: interaction.user.username,
  guildId: interaction.guildId,
  channelId: interaction.channelId,
  success: true,
  executionTime: 42,
});

// Track an event
await analytics.trackEvent({
  eventName: "messageCreate",
  guildId: message.guildId ?? undefined,
  channelId: message.channelId,
  userId: message.author.id,
});

// Track AI usage
await analytics.trackAI({
  messageId: message.id,
  modelUsed: globalModel.modelId,
  toolCallCount: 2,
  toolsUsed: ["oracle", "addReactions"],
  stepCount: 3,
  generationTime: 1850,
  success: true,
  decisionReason: "explicit_ping",
});

// Retrieve data
const today = AnalyticsQueries.getToday();
const commands = await analytics.getCommandsByDate(today);
```

---

### Analytics Types

```typescript { .api }
// From: utils/analytics/types.ts

interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: {
    commands: number;   // Default: 90
    events: number;     // Default: 60
    messages: number;   // Default: 90
    ai: number;         // Default: 90
  };
  pruneOnStartup: boolean;            // Default: true
  pruneInterval: "daily" | "weekly";  // Default: "daily"
  anonymizeUserData: boolean;         // Default: false
}

interface CommandAnalytics {
  id: string;
  commandName: string;
  userId: string;
  username: string;
  guildId: string | null;
  channelId: string;
  timestamp: number;             // Unix milliseconds
  success: boolean;
  error?: string;
  executionTime?: number;        // Milliseconds
  options?: Record<string, any>; // Command option values
}

interface EventAnalytics {
  id: string;
  eventName: string;
  timestamp: number;             // Unix milliseconds
  guildId?: string;
  channelId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface MessageAnalytics {
  id: string;
  messageId: string;
  userId: string;
  channelId: string;
  guildId: string | null;
  timestamp: number;             // Unix milliseconds
  isDM: boolean;
  isMentioned: boolean;
  isReply: boolean;
  processReason: string;         // See ConversationManager.shouldProcess reasons
  messageLength: number;
  hasAttachments: boolean;
  attachmentCount: number;
  responseGenerated: boolean;
  responseTime?: number;         // Milliseconds
  error?: string;
}

interface AIAnalytics {
  id: string;
  messageId: string;
  timestamp: number;             // Unix milliseconds
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  toolCallCount: number;
  toolsUsed: string[];           // Unique tool names used
  stepCount: number;
  generationTime: number;        // Milliseconds
  success: boolean;
  error?: string;
  decisionReason?: string;       // Why the message was processed (e.g., "explicit_ping")
}

interface ToolUsageAnalytics {
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  avgExecutionTime?: number;
  lastUsed: number;              // Unix milliseconds
}

interface DailyIndex {
  date: string;                  // YYYY-MM-DD
  totalEvents: number;
  eventTypes: Record<string, number>;
  lastUpdated: number;
}

interface IndexMetadata {
  totalRecords: number;
  dateRange: {
    start: string;               // YYYY-MM-DD
    end: string;                 // YYYY-MM-DD
  };
  lastUpdated: number;           // Unix milliseconds
  categories?: Record<string, number>;
}
```

---

### Analytics Configuration Manager

Manages the analytics configuration file at `data/analytics/config.json`.

```typescript { .api }
// From: utils/analytics/config.ts
// Import: import { analyticsConfig } from "./utils/analytics/config";

class ConfigManager {
  /** Initialize config from file (auto-called by analytics manager) */
  initialize(): Promise<void>;

  /** Save current config to disk */
  save(): Promise<void>;

  /** Get a copy of the current configuration */
  get(): AnalyticsConfig;

  /** Update one or more config fields and save */
  update(updates: Partial<AnalyticsConfig>): Promise<void>;

  /** Update retention days for a specific category and save */
  setRetentionDays(
    category: keyof AnalyticsConfig['retentionDays'],
    days: number
  ): Promise<void>;
}

export const analyticsConfig: ConfigManager;
```

**Usage example:**

```typescript
import { analyticsConfig } from "./utils/analytics/config";

// Disable analytics
await analyticsConfig.update({ enabled: false });

// Change AI data retention to 30 days
await analyticsConfig.setRetentionDays("ai", 30);

// Get current config
const config = analyticsConfig.get();
console.log(config.retentionDays.commands); // 90
```

---

### Analytics Storage

Low-level file-based storage for analytics data, organized by date and type.

```typescript { .api }
// From: utils/analytics/storage.ts
// Import: import { AnalyticsStorage } from "./utils/analytics/storage";

class AnalyticsStorage {
  /**
   * @param category - The analytics category for this storage instance
   */
  constructor(category: 'commands' | 'events' | 'messages' | 'ai');

  /** Initialize storage directories (auto-called on first use) */
  initialize(): Promise<void>;

  /**
   * Save a record to by-date and by-type indexes
   * @param data - Record with required id and timestamp fields
   * @param type - Category subtype (e.g., command name, event name)
   */
  save<T extends { id: string; timestamp: number }>(data: T, type: string): Promise<void>;

  /** Get all records for a date (YYYY-MM-DD) */
  getByDate<T>(date: string): Promise<T[]>;

  /** Get all records for a specific type/subtype */
  getByType<T>(type: string): Promise<T[]>;

  /** Get the index metadata file */
  getIndex(): Promise<IndexMetadata | null>;

  /**
   * Delete records older than retentionDays
   * @returns Number of deleted date files
   */
  prune(retentionDays: number): Promise<number>;
}
```

**File structure:**

```
data/analytics/
  <category>/
    by-date/
      YYYY-MM-DD.json  # Array of records for that date
    by-type/
      <type>.json      # Array of records for that type/subtype
    index.json         # IndexMetadata
  config.json          # AnalyticsConfig
```

---

### Analytics Queries

Static utility class for aggregating analytics data across date ranges.

```typescript { .api }
// From: utils/analytics/queries.ts
// Import: import { AnalyticsQueries } from "./utils/analytics/queries";

class AnalyticsQueries {
  /**
   * Get aggregated command statistics for a date range
   */
  static getCommandStats(startDate: string, endDate: string): Promise<{
    totalCommands: number;
    successRate: number;          // 0.0 to 1.0
    byCommand: Record<string, {
      count: number;
      successRate: number;        // 0.0 to 1.0
    }>;
    avgExecutionTime: number;     // Milliseconds
  }>;

  /**
   * Get aggregated message processing statistics for a date range
   */
  static getMessageStats(startDate: string, endDate: string): Promise<{
    totalMessages: number;
    processed: number;            // Messages that generated a response
    responseGenerated: number;    // Same as processed
    byReason: Record<string, number>;  // Count by process reason
    avgResponseTime: number;      // Milliseconds
  }>;

  /**
   * Get aggregated AI usage statistics for a date range
   */
  static getAIStats(startDate: string, endDate: string): Promise<{
    totalGenerations: number;
    successRate: number;          // 0.0 to 1.0
    avgGenerationTime: number;    // Milliseconds
    toolUsage: ToolUsageAnalytics[];
    totalTokens: number;
    byModel: Record<string, number>;   // Count by model name
  }>;

  /**
   * Get aggregated event statistics for a date range
   */
  static getEventStats(startDate: string, endDate: string): Promise<{
    totalEvents: number;
    byEvent: Record<string, number>;   // Count by event name
  }>;

  /**
   * Get top users by total activity (messages + commands)
   * @param limit - Max users to return (default: 10)
   */
  static getTopUsers(
    startDate: string,
    endDate: string,
    limit?: number
  ): Promise<Array<{
    userId: string;
    messageCount: number;
    commandCount: number;
  }>>;

  /** Get today's date as YYYY-MM-DD */
  static getToday(): string;

  /** Get a date N days ago as YYYY-MM-DD */
  static getDaysAgo(days: number): string;
}
```

**Usage example:**

```typescript
import { AnalyticsQueries } from "./utils/analytics/queries";

const today = AnalyticsQueries.getToday();
const weekAgo = AnalyticsQueries.getDaysAgo(7);

// Get AI stats for the last 7 days
const aiStats = await AnalyticsQueries.getAIStats(weekAgo, today);
console.log(`Success rate: ${(aiStats.successRate * 100).toFixed(1)}%`);
console.log(`Total tokens: ${aiStats.totalTokens}`);
console.log(`Models used:`, aiStats.byModel);

// Get top 5 users
const topUsers = await AnalyticsQueries.getTopUsers(weekAgo, today, 5);
topUsers.forEach((user, i) => {
  console.log(`${i + 1}. ${user.userId}: ${user.messageCount} msgs, ${user.commandCount} cmds`);
});
```
