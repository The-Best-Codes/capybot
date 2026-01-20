export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: {
    commands: number;
    events: number;
    messages: number;
    ai: number;
  };
  pruneOnStartup: boolean;
  pruneInterval: "daily" | "weekly";
  anonymizeUserData: boolean;
}

export interface CommandAnalytics {
  id: string;
  commandName: string;
  userId: string;
  username: string;
  guildId: string | null;
  channelId: string;
  timestamp: number;
  success: boolean;
  error?: string;
  executionTime?: number;
  options?: Record<string, any>;
}

export interface EventAnalytics {
  id: string;
  eventName: string;
  timestamp: number;
  guildId?: string;
  channelId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface MessageAnalytics {
  id: string;
  messageId: string;
  userId: string;
  channelId: string;
  guildId: string | null;
  timestamp: number;
  isDM: boolean;
  isMentioned: boolean;
  isReply: boolean;
  processReason: string;
  messageLength: number;
  hasAttachments: boolean;
  attachmentCount: number;
  responseGenerated: boolean;
  responseTime?: number;
  error?: string;
}

export interface AIAnalytics {
  id: string;
  messageId: string;
  timestamp: number;
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  toolCallCount: number;
  toolsUsed: string[];
  stepCount: number;
  generationTime: number;
  success: boolean;
  error?: string;
  decisionReason?: string;
}

export interface ToolUsageAnalytics {
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  avgExecutionTime?: number;
  lastUsed: number;
}

export interface DailyIndex {
  date: string;
  totalEvents: number;
  eventTypes: Record<string, number>;
  lastUpdated: number;
}

export interface IndexMetadata {
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
  };
  lastUpdated: number;
  categories?: Record<string, number>;
}
