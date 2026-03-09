# Implement the Analytics Tracking Module

Implement an `AnalyticsManager` class with an `initialize()` method and four tracking methods. Data is persisted to the file system organised by date (`data/analytics/by-date/YYYY-MM-DD.json`) and by type (`data/analytics/by-type/{type}.json`).

## Capabilities { .capabilities }

### Class interface

```ts
class AnalyticsManager {
  async initialize(): Promise<void>

  async trackCommand(data: {
    name: string;
    userId: string;
    guildId: string;
    channelId: string;
    success: boolean;
    executionTime: number;
    options?: Record<string, unknown>;
  }): Promise<void>

  async trackEvent(data: {
    eventName: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>

  async trackMessage(data: {
    contentLength: number;
    hasAttachments: boolean;
    processingReason: string;
    responseTime: number;
    success: boolean;
  }): Promise<void>

  async trackAI(data: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    toolCalls: number;
    generationTime: number;
    success: boolean;
    reason: string;
  }): Promise<void>
}
```

### Persistence behavior

- Each tracked event is appended to the daily JSON file at `data/analytics/by-date/YYYY-MM-DD.json`.
- Each tracked event is also appended to the type-specific file at `data/analytics/by-type/{type}.json`.
- `initialize()` creates the necessary directories if they do not exist.

### Test cases

- `trackCommand(...)` appends a record with `type: "command"` to today's date file [@test](./tests/analytics.test.ts)
- `trackAI(...)` appends a record with `type: "ai"` to the `by-type/ai.json` file [@test](./tests/analytics.test.ts)
- `initialize()` creates `data/analytics/by-date/` and `data/analytics/by-type/` directories [@test](./tests/analytics.test.ts)
- `trackMessage(...)` records the `processingReason` field in the persisted entry [@test](./tests/analytics.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot providing the analytics tracking system for recording command, event, message, and AI generation metrics with file-based persistence.
