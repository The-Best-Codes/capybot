# AI System & Context Building

This document covers the AI provider configuration, context building, and system prompt constants used by CapyBot.

## Capabilities

### AI Client Configuration

Configures an OpenAI-compatible AI provider from environment variables and exports pre-built model instances.

```typescript { .api }
// From: clients/ai.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const aiProvider: ReturnType<typeof createOpenAICompatible>;
export const globalModel: LanguageModelV1;     // For conversational responses
export const attachmentModel: LanguageModelV1; // For attachment analysis (lower quality/cost)
```

**Environment variables:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_API_KEY` | Yes | — | API key for the AI provider |
| `AI_BASE_URL` | Yes | `""` | Base URL of the OpenAI-compatible provider |
| `AI_GLOBAL_MODEL` | No | `"gemini-3-flash-preview"` | Model ID for conversations |
| `AI_ATTACHMENT_MODEL` | No | `"gemini-2.5-flash-lite"` | Model ID for attachment analysis |

**Usage example:**

```typescript
import { aiProvider, globalModel, attachmentModel } from "./clients/ai";

// Use a custom model from the same provider
const customModel = aiProvider("my-custom-model");

// Use the global model for text generation
import { generateText } from "ai";
const result = await generateText({ model: globalModel, prompt: "Hello" });
```

---

### System Prompt Constants

Constants and the full system prompt string for the AI, including bot identity, behavior rules, response format directives, and tool limitations.

```typescript { .api }
// From: utils/ai/systemPrompt.ts

/** Output EXACTLY this string to skip responding to a message */
export const IGNORE_PHRASE: string; // "[[IGNORE]]"

/** Regex pattern for custom reply targeting in AI output */
export const REPLY_PHRASE_REGEX: RegExp; // /\[\[REPLY:([^\]]+)\]\]/

/** Value indicating no reply target (send without replying) */
export const REPLY_NONE: string; // "NONE"

/** Discord user ID of the developer (BestCodes) */
export const DEVELOPER_ID: string; // "1154823189164199936"

/** Maximum number of tool call steps per message generation */
export const MAX_TOOL_STEPS: number; // 10

/** Full system prompt string for the AI */
export const systemInstructions: string;
```

**IGNORE_PHRASE behavior:**
- The AI outputs `"[[IGNORE]]"` exactly to skip sending a text response
- Can be used after performing an action (e.g., after `addReactions`) to suppress text response
- The message handler checks for this phrase and exits without sending

**REPLY_PHRASE_REGEX behavior:**
- AI can include `[[REPLY:message_id]]` anywhere in its response to reply to a specific message
- AI can include `[[REPLY:NONE]]` to send without replying to any message
- Default: replies to the triggering message (for explicit pings) or sends without reply (for overheard messages)
- The phrase is stripped from the final message before sending

---

### Context Building

Builds a structured JSON context string from a Discord message, including message history, user/channel/role dictionaries, and tool call history.

```typescript { .api }
// From: utils/ai/context/index.ts
async function buildContext(message: Message<boolean>): Promise<string>
```

**Returns:** JSON string with the following structure:

```typescript
{
  dictionary: {
    users: Record<string, {
      username: string;
      display_name: string;
      is_bot: boolean;
    }>;
    channels: Record<string, {
      name: string;
      type: string;  // ChannelType enum name
    }>;
    roles: Record<string, {
      name: string;
    }>;
    referenced_messages: Record<string, ReferencedMessage>;
  };
  current_guild: {
    id: string;
    name: string;
    member_count: number;
  } | null;
  current_channel: {
    id: string;
    name: string;
    type: string;
    topic: string | null;
  };
  message_history: Array<{
    id: string;
    author_id: string;
    content: string;
    timestamp: string;
    referenced_message_id: string | null;
    attachments?: SerializedAttachment[];
    tool_calls?: string;  // JSON string of ToolCall[]
  }>;
  current_message: {
    id: string;
    author_id: string;
    channel_id: string;
    content: string;
    timestamp: string;
    referenced_message_id: string | null;
    attachments?: SerializedAttachment[];
  };
  tool_calls?: string;  // JSON string of ToolCall[] for current message
}
```

**Behavior:**
- Fetches up to 50 recent messages from the channel (excluding system messages)
- Registers all mentioned users, channels, and roles in the dictionary
- Fetches referenced/replied-to messages not already in history and adds to dictionary
- Enriches history entries with tool call history from `toolCallStore`
- The context is passed as the `prompt` to the AI (not as user message content)

---

### Context Types

```typescript { .api }
// From: utils/ai/context/types.ts

interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  size: number;
  width: number | null;
  height: number | null;
}

interface ReferencedMessage {
  id: string;
  author_id: string;
  content: string;
  timestamp: string;        // UTC string from Date.toUTCString()
  referenced_message_id: string | null;
  attachments?: SerializedAttachment[];
}
```

---

### Context Dictionary

Collects and serializes Discord entities (users, channels, roles, referenced messages) for inclusion in AI context.

```typescript { .api }
// From: utils/ai/context/dictionary.ts
class ContextDictionary {
  /**
   * Register a Discord user or guild member
   * Uses Discord user ID as key; deduplicates automatically
   */
  registerUser(user: User | GuildMember): void;

  /**
   * Register a Discord channel
   * Uses channel ID as key; deduplicates automatically
   */
  registerChannel(channel: Channel | GuildBasedChannel): void;

  /**
   * Register a Discord role
   * Uses role ID as key; deduplicates automatically
   */
  registerRole(role: Role): void;

  /**
   * Register a referenced/replied-to message
   * Uses message ID as key; deduplicates automatically
   */
  registerReferencedMessage(message: ReferencedMessage): void;

  /**
   * Get the serialized dictionary for inclusion in AI context
   */
  getDictionary(): {
    users: Record<string, {
      username: string;
      display_name: string;
      is_bot: boolean;
    }>;
    channels: Record<string, {
      name: string;
      type: string;
    }>;
    roles: Record<string, {
      name: string;
    }>;
    referenced_messages: Record<string, ReferencedMessage>;
  };
}
```

**Usage example:**

```typescript
import { ContextDictionary } from "./utils/ai/context/dictionary";
import type { ReferencedMessage } from "./utils/ai/context/types";

const dict = new ContextDictionary();

// Register entities
dict.registerUser(message.member || message.author);
message.mentions.users.forEach(u => dict.registerUser(u));
message.mentions.channels.forEach(c => dict.registerChannel(c));
message.mentions.roles.forEach(r => dict.registerRole(r));

// Get serialized dictionary
const dictionary = dict.getDictionary();
console.log(dictionary.users); // { "user_id": { username, display_name, is_bot } }
```
