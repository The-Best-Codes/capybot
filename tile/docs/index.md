# CapyBot

CapyBot is a self-hosted, AI-powered Discord bot application written in TypeScript and designed to run on the Bun runtime. It uses the discraft framework for Discord bot scaffolding and integrates discord.js for Discord API interaction. The bot features multi-provider AI support through the Vercel AI SDK, enabling conversational AI responses in Discord channels and DMs with tool-calling capabilities.

## Package Information

- **Package Name**: capybot
- **Package Type**: GitHub application (not published to any registry)
- **Language**: TypeScript
- **Runtime**: Bun
- **Repository**: github:The-Best-Codes/capybot
- **Framework**: discraft (Discord bot scaffolding)
- **Setup**: Clone repo, configure `.env`, run `bun install && bun start`

## Core Imports

```typescript
// Main entry point
import "./index.ts"; // via: bun run start (uses discraft)

// Clients
import client from "./clients/discord";        // discord.js Client
import { aiProvider, globalModel, attachmentModel } from "./clients/ai";

// AI utilities
import { buildContext } from "./utils/ai/context";
import { systemInstructions, IGNORE_PHRASE, REPLY_PHRASE_REGEX, MAX_TOOL_STEPS } from "./utils/ai/systemPrompt";
import { createTools } from "./utils/ai/tools";

// Data layer
import { analytics } from "./utils/analytics";
import { toolCallStore } from "./utils/db/toolCallsDb";
import { conversationManager } from "./utils/conversation/manager";

// Auth
import { checkDevAuth, generateDevKey, validateDevKey } from "./utils/auth/devAuth";
import { requireDevAuth } from "./utils/auth/devCommandGuard";
import { hasPermission } from "./utils/auth/permissions";

// Logger
import { logger } from "./utils/logger";
```

## Basic Usage

### Running the Bot

```bash
# Install dependencies
bun install

# Configure environment variables
cp .env.example .env
# Edit .env with your tokens

# Start the bot
bun run start

# Development mode (hot reload)
bun run dev

# Build (production)
bun run build

# Type check
bun run tsc

# Format
bun run fmt

# Lint
bun run lint
```

### Required Environment Variables

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_APP_ID=your_discord_application_id
AI_API_KEY=your_ai_provider_api_key
AI_BASE_URL=https://your-ai-provider-base-url
DEV_AUTH_SECRET=your_hmac_secret_for_dev_keys
```

### Optional Environment Variables

```env
AI_GLOBAL_MODEL=gemini-3-flash-preview     # Default conversational model
AI_ATTACHMENT_MODEL=gemini-2.5-flash-lite  # Model for attachment analysis
```

### Generating Developer Keys

```bash
# Interactive
bun scripts/dev-auth.ts generate

# Non-interactive
bun scripts/dev-auth.ts generate username --expires 30 --permissions dm,dev_slash_commands

# View key info
bun scripts/dev-auth.ts info <key>

# Revoke a key
bun scripts/dev-auth.ts revoke --key <key>
# Or revoke all sessions for a user
bun scripts/dev-auth.ts revoke --user username
```

## Architecture

CapyBot is built around several key systems:

- **Discord Client** (`clients/discord.ts`): A configured discord.js Client with all required intents for guild and DM messaging
- **AI Client** (`clients/ai.ts`): OpenAI-compatible provider configured for multi-model support
- **Message Pipeline** (`events/messageCreate.ts`): Event-driven message handling with decision logic, context building, AI generation, and response sending
- **Conversation Manager** (`utils/conversation/manager.ts`): Stateful per-channel tracking for hot windows, generating state, and response decisions
- **Context Builder** (`utils/ai/context/index.ts`): Builds rich JSON context from Discord messages, including history, user info, and tool call history
- **AI Tools** (`utils/ai/tools/`): Tool definitions for reactions, image generation, attachment analysis, message sending, and server info lookup (oracle)
- **Analytics** (`utils/analytics/`): File-based analytics storage for commands, events, messages, and AI usage
- **Dev Auth** (`utils/auth/`): HMAC-based developer key system with session management and permission scoping
- **Tool Calls DB** (`utils/db/toolCallsDb.ts`): Persists AI tool call history per message for 30 days

## Capabilities

### AI System & Context Building

Configures AI providers, builds message context, and manages system prompt constants.

```typescript { .api }
// AI client exports
export const aiProvider: OpenAICompatibleProvider;
export const globalModel: LanguageModelV1;
export const attachmentModel: LanguageModelV1;

// Context building
async function buildContext(message: Message<boolean>): Promise<string>;

// System prompt constants
export const IGNORE_PHRASE: string;        // "[[IGNORE]]"
export const REPLY_PHRASE_REGEX: RegExp;   // /\[\[REPLY:([^\]]+)\]\]/
export const REPLY_NONE: string;           // "NONE"
export const DEVELOPER_ID: string;         // Discord user ID of the developer
export const MAX_TOOL_STEPS: number;       // 10
export const systemInstructions: string;
```

[AI System & Context](./ai-system.md)

### AI Tools

Five AI-callable tools: add emoji reactions, generate images, describe attachments, send messages to channels, and query server information (oracle).

```typescript { .api }
function createTools(channel: TextBasedChannel, guild: Guild | null): {
  addReactions: Tool;
  getAttachmentDescription: Tool;
  generateImage: Tool;
  oracle: Tool;
  sendMessages: Tool;
};
```

[AI Tools](./ai-tools.md)

### Analytics

File-based analytics tracking and querying for commands, events, messages, and AI usage across configurable retention windows.

```typescript { .api }
// analytics singleton
analytics.trackCommand(data: Omit<CommandAnalytics, 'id' | 'timestamp'>): Promise<void>;
analytics.trackEvent(data: Omit<EventAnalytics, 'id' | 'timestamp'>): Promise<void>;
analytics.trackMessage(data: Omit<MessageAnalytics, 'id' | 'timestamp'>): Promise<void>;
analytics.trackAI(data: Omit<AIAnalytics, 'id' | 'timestamp'>): Promise<void>;

// Query helpers
AnalyticsQueries.getCommandStats(startDate: string, endDate: string): Promise<CommandStatsResult>;
AnalyticsQueries.getMessageStats(startDate: string, endDate: string): Promise<MessageStatsResult>;
AnalyticsQueries.getAIStats(startDate: string, endDate: string): Promise<AIStatsResult>;
AnalyticsQueries.getEventStats(startDate: string, endDate: string): Promise<EventStatsResult>;
AnalyticsQueries.getTopUsers(startDate: string, endDate: string, limit?: number): Promise<TopUsersResult[]>;
AnalyticsQueries.getToday(): string;
AnalyticsQueries.getDaysAgo(days: number): string;
```

[Analytics](./analytics.md)

### Developer Authentication

HMAC-signed developer key system with session management and permission-based access control for DMs and developer slash commands.

```typescript { .api }
function generateDevKey(username: string, expirationDays?: number, permissions?: DevPermission[]): string;
function validateDevKey(key: string, discordUsername: string): KeyValidationResult;
function checkDevAuth(discordUserId: string, discordUsername: string): KeyValidationResult & { loggedIn: boolean };
async function requireDevAuth(interaction: ChatInputCommandInteraction): Promise<boolean>;
function hasPermission(permissions: DevPermission[] | undefined, permission: DevPermission): boolean;

type DevPermission = "dm" | "dev_slash_commands";
```

[Developer Authentication](./auth.md)

### Conversation Management

Per-channel state tracking to decide whether to respond to messages, including hot windows, keyword triggers, and random overhearing.

```typescript { .api }
// conversationManager singleton
conversationManager.shouldProcess(
  message: Message,
  botId: string,
  isMentioned: boolean,
  isReplyToBot: boolean,
): { process: boolean; reason: string };

conversationManager.setGenerating(channelId: string, isGenerating: boolean): void;
conversationManager.markInteraction(channelId: string, userId: string): void;
```

[Conversation Management](./conversation.md)

### Tool Calls Database

File-based persistence for AI tool call history associated with Discord messages, with 30-day retention.

```typescript { .api }
interface ToolCall {
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  output?: Record<string, any> | null;
  isError?: boolean;
  error?: string;
  stepNumber: number;
  timestamp: number;
  executionTime?: number;
}

// toolCallStore singleton
toolCallStore.save(messageId: string, toolCalls: ToolCall[]): Promise<void>;
toolCallStore.get(messageId: string): Promise<ToolCall[]>;
```

[Tool Calls Database](./database.md)

### Slash Commands

Six slash commands: `/ping`, `/dev_analytics`, `/dev_context`, `/dev_flex`, `/dev_login`, `/dev_toolcalls`.

[Commands](./commands.md)

### Discord Event Handlers

Four event handlers: `messageCreate` (AI pipeline), `interactionCreate` (command routing + modal handling), `ready` (presence setup), `error` (error logging).

[Events](./events.md)

### Logger

Thin wrapper re-exporting [consola](https://github.com/unjs/consola) as `logger` for structured logging throughout the bot.

```typescript { .api }
// From: utils/logger.ts
import { logger } from "./utils/logger";

// logger is a consola instance with methods:
logger.info(message: string, ...args: any[]): void;
logger.success(message: string, ...args: any[]): void;
logger.warn(message: string, ...args: any[]): void;
logger.error(message: string, ...args: any[]): void;
logger.debug(message: string, ...args: any[]): void;
logger.verbose(message: string, ...args: any[]): void;
logger.start(message: string, ...args: any[]): void;
```
