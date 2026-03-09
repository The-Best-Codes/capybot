# AI Tools

CapyBot provides five AI-callable tools, each created by a factory function and bound to a Discord channel/guild context at runtime.

## Capabilities

### Tool Factory

Creates all AI tools bound to a specific Discord channel and guild context.

```typescript { .api }
// From: utils/ai/tools/index.ts
function createTools(channel: TextBasedChannel, guild: Guild | null): {
  addReactions: Tool;
  getAttachmentDescription: Tool;
  generateImage: Tool;
  oracle: Tool;
  sendMessages: Tool;
}

type Tools = ReturnType<typeof createTools>;
```

**Usage:**

```typescript
import { createTools } from "./utils/ai/tools";
import { generateText, stepCountIs } from "ai";
import { globalModel } from "./clients/ai";
import { systemInstructions, MAX_TOOL_STEPS } from "./utils/ai/systemPrompt";

const tools = createTools(message.channel, message.guild);
const result = await generateText({
  model: globalModel,
  prompt: context,
  system: systemInstructions,
  tools,
  stopWhen: stepCountIs(MAX_TOOL_STEPS),
});
```

---

### `addReactions` Tool

Adds emoji reactions to a Discord message in the current channel.

```typescript { .api }
// Created by: createAddReactionsTool(channel: TextBasedChannel)

// Tool input schema:
interface AddReactionsInput {
  messageId: string;    // ID of the message to react to
  reactions: string[];  // Array of 1-5 emojis (unicode or Discord emoji format)
}

// Tool output:
interface AddReactionsOutput {
  success: boolean;
  error?: string;       // Present if success is false
}
```

**Notes:**
- Accepts 1 to 5 reactions per call
- Emoji format: unicode (`"😀"`) or Discord custom emoji (`"<:name:id>"`)
- Errors are returned in the `error` field, not thrown

---

### `generateImage` Tool

Generates an image using Pollinations AI based on a text prompt.

```typescript { .api }
// Created by: createGenerateImageTool()

// Tool input schema:
interface GenerateImageInput {
  prompt: string;    // Detailed description of the image to generate
  width?: number;    // Width in pixels (default: 1024)
  height?: number;   // Height in pixels (default: 1024)
}

// Tool output:
interface GenerateImageOutput {
  success: boolean;
  imageUrl?: string;       // Full URL to the generated image (if success)
  instructions?: string;   // Markdown embed instructions for the AI (if success)
  message?: string;        // Error description (if !success)
  error?: string;          // Error detail (if !success)
}
```

**Notes:**
- Uses Pollinations AI with the `analog-diffusion` model
- When successful, `instructions` contains: `"Embed the image in your message using the following markdown syntax: [Image](url)"`
- The AI is expected to include the markdown embed in its text response
- Parameters `nologo=true`, `enhance=true`, `safe=true` are always applied

---

### `getAttachmentDescription` Tool

Analyzes an attachment (image, document, etc.) using AI and returns a description.

```typescript { .api }
// Created by: createGetAttachmentDescriptionTool()

// Tool input schema:
interface GetAttachmentDescriptionInput {
  url: string;             // URL of the attachment
  mediaType?: string;      // MIME type (e.g., "image/png", "application/pdf")
  customPrompt?: string;   // Custom analysis prompt (optional)
}

// Tool output:
interface GetAttachmentDescriptionOutput {
  success: boolean;
  summary?: string;   // AI-generated description (if success)
  error?: string;     // Error detail (if !success)
}
```

**Notes:**
- Uses `attachmentModel` (configured via `AI_ATTACHMENT_MODEL` env var, default: `gemini-2.5-flash-lite`)
- If `mediaType` is not provided or is `"application/octet-stream"`, the type is inferred from the URL extension
- Default prompt: `"Give a very verbose description of this attachment. Describe all visible elements, content, and any other notable details."`
- Max output: 2048 tokens
- Supported MIME types (auto-detected from extension): `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/bmp`, `image/svg+xml`, `application/pdf`, `text/plain`, `text/markdown`, `application/json`, `application/xml`, `video/mp4`, `video/webm`, `audio/mpeg`, `audio/wav`, `audio/ogg`
- Falls back to `"image/png"` for unknown extensions

---

### `oracle` Tool

Queries Discord server information: messages, channels, and users. Supports both fuzzy search and direct ID lookup.

```typescript { .api }
// Created by: createOracleTool(channel: TextBasedChannel, guild: Guild | null)

// Input is a discriminated union on the "action" field:
type OracleInput =
  | {
      action: "messages";
      id?: string;        // Message ID for direct lookup
      query?: string;     // Fuzzy search text (plain text, not filter syntax)
      channelId?: string; // Restrict search to this channel
      limit?: number;     // 1-100, default 10
    }
  | {
      action: "channels";
      id?: string;        // Channel ID for direct lookup
      query?: string;     // Fuzzy search text
      limit?: number;     // 1-100, default 100
    }
  | {
      action: "users";
      id?: string;        // User ID for direct lookup
      query?: string;     // Fuzzy search text (username, display name, nickname, roles)
      limit?: number;     // 1-100, default 100
    };
```

**Output when `id` is provided (mode: "get"):**

```typescript
// Messages
{
  success: true;
  action: "messages";
  mode: "get";
  result: DetailedMessage;
  warning?: string;
}

// Channels
{
  success: true;
  action: "channels";
  mode: "get";
  result: DetailedChannel;
}

// Users
{
  success: true;
  action: "users";
  mode: "get";
  result: DetailedUser;
}
```

**Output when searching (mode: "search"):**

```typescript
// Messages
{
  success: true;
  action: "messages";
  mode: "search";
  count: number;
  totalSearched: number;
  truncated: boolean;
  warning?: string;
  results: Array<SerializedMessage & { relevanceScore: number | null }>;
}

// Channels
{
  success: true;
  action: "channels";
  mode: "search";
  count: number;
  totalChannels: number;
  truncated: boolean;
  results: Array<SerializedChannel & { relevanceScore: number | null }>;
}

// Users
{
  success: true;
  action: "users";
  mode: "search";
  count: number;
  totalMembers: number;
  truncated: boolean;
  warning?: string;
  results: Array<SerializedUser & { relevanceScore: number | null }>;
}
```

**Error output:**

```typescript
{
  success: false;
  action: "messages" | "channels" | "users";
  error: string;
  warning?: string;
}
```

**Important notes:**
- Only works within a server (guild); returns error in DMs
- Message IDs and channel IDs are separate namespaces - do not confuse them
- `query` is plain text fuzzy matching (e.g., `"hello world"`), NOT filter syntax
- To search messages in a specific channel: provide both `query` and `channelId`
- `relevanceScore` is `null` for empty queries (returns all/latest)

---

### Oracle Types

```typescript { .api }
// From: utils/ai/tools/oracle/types.ts

interface SerializedMessage {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  channelId: string;
  channelName: string;
  timestamp: string;       // ISO 8601
  hasAttachments: boolean;
  attachmentCount: number;
}

interface SerializedChannel {
  id: string;
  name: string;
  type: string;            // ChannelType enum name
  topic: string | null;
  parentId: string | null;
  parentName: string | null;
  position: number;
  memberCount?: number;
}

interface SerializedUser {
  id: string;
  username: string;
  displayName: string;
  discriminator: string;
  isBot: boolean;
  nickname: string | null;
  roles: string[];         // Role names (excluding @everyone)
  rolesString: string;     // Space-separated role names
  joinedAt: string | null; // ISO 8601
}

interface SerializedReaction {
  emoji: string;
  emojiId: string | null;
  count: number;
  me: boolean;
}

interface SerializedEmbed {
  title: string | null;
  description: string | null;
  url: string | null;
  color: number | null;
  timestamp: string | null;
  footer: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  fields: { name: string; value: string; inline: boolean }[];
}

interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string | null;
  width: number | null;
  height: number | null;
}

interface SerializedSticker {
  id: string;
  name: string;
  formatType: string;
}

interface SerializedMention {
  users: { id: string; username: string }[];
  roles: { id: string; name: string }[];
  channels: { id: string; name: string }[];
  everyone: boolean;
}

interface SerializedPermissionOverwrite {
  id: string;
  type: "role" | "member";
  name: string | null;
  allow: string[];         // Permission flag names
  deny: string[];          // Permission flag names
}

/** Extended message with full details (returned for ID-based lookups) */
interface DetailedMessage extends SerializedMessage {
  editedTimestamp: string | null;
  isPinned: boolean;
  reactions: SerializedReaction[];
  embeds: SerializedEmbed[];
  attachments: SerializedAttachment[];
  stickers: SerializedSticker[];
  mentions: SerializedMention;
  replyTo: {
    messageId: string;
    authorId: string;
    authorUsername: string;
    contentPreview: string;
  } | null;
  thread: {
    id: string;
    name: string;
    messageCount: number;
  } | null;
  type: string;
  url: string;
}

/** Extended channel with full details (returned for ID-based lookups) */
interface DetailedChannel extends SerializedChannel {
  nsfw: boolean;
  rateLimitPerUser: number | null;
  lastMessageId: string | null;
  lastMessageTimestamp: string | null;
  createdAt: string;
  permissionOverwrites: SerializedPermissionOverwrite[];
  threadMetadata: {
    archived: boolean;
    locked: boolean;
    autoArchiveDuration: number | null;
    ownerId: string | null;
    ownerUsername: string | null;
    messageCount: number;
    memberCount: number;
  } | null;
  voiceInfo: {
    bitrate: number;
    userLimit: number;
    rtcRegion: string | null;
  } | null;
}

/** Extended user with full details (returned for ID-based lookups) */
interface DetailedUser extends SerializedUser {
  avatarUrl: string | null;
  bannerUrl: string | null;
  accentColor: number | null;
  accountCreatedAt: string;         // ISO 8601
  premiumSince: string | null;      // ISO 8601
  communicationDisabledUntil: string | null;
  pending: boolean;
  permissions: string[];            // Permission flag names
  voiceState: {
    channelId: string | null;
    channelName: string | null;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    streaming: boolean;
    camera: boolean;
  } | null;
  presence: {
    status: string;
    clientStatus: {
      desktop: string | null;
      mobile: string | null;
      web: string | null;
    };
    activities: {
      name: string;
      type: string;
      details: string | null;
      state: string | null;
    }[];
  } | null;
}
```

**Serialization functions (also exported):**

```typescript { .api }
function serializeMessage(msg: Message, channelName: string): SerializedMessage;
function serializeChannel(channel: GuildChannel | ThreadChannel, parentName: string | null): SerializedChannel;
function serializeUser(member: GuildMember): SerializedUser;
function serializeBasicUser(user: User): SerializedUser; // No guild-specific info
```

---

### `sendMessages` Tool

Sends messages to Discord channels in the current server, with optional reply targeting.

```typescript { .api }
// Created by: createSendMessagesTool(currentChannel: TextBasedChannel, guild: Guild | null)

// Tool input schema:
interface SendMessagesInput {
  messages: Array<{
    channelId: string;           // Target channel ID
    content: string;             // Message text content
    replyToMessageId?: string;   // Optional: reply to a specific message
  }>;  // 1-10 messages
}

// Tool output:
interface SendMessagesOutput {
  success: boolean;  // True only if ALL messages succeeded
  results: Array<{
    channelId: string;
    messageId?: string;   // ID of sent message (if success)
    success: boolean;
    error?: string;       // "Channel not found" | "Channel is not a text channel" | <error message>
  }>;
}
```

**Notes:**
- Only works in servers (guild required); returns error in DMs
- Can send 1 to 10 messages in a single tool call
- Each message can optionally reply to a specific message by ID
- Fetches each channel from the guild by ID; channel must be text-based
- `success` at the top level is `true` only if every individual message succeeded
- Check individual `results[i].success` for per-message status

---

## Oracle Internal Helpers

The following helper functions and types are used internally by the oracle tool. They are exported and can be used independently for custom oracle functionality.

### `getMessage` / `getChannel` / `getUser`

```typescript { .api }
// From: utils/ai/tools/oracle/getMessage.ts
interface GetMessageParams {
  guild: Guild;
  messageId: string;
  channelId?: string;
}
interface GetMessageResult {
  message: DetailedMessage | null;
  warning?: string;
}
async function getMessage(params: GetMessageParams): Promise<GetMessageResult>;

// From: utils/ai/tools/oracle/getChannel.ts
interface GetChannelParams {
  guild: Guild;
  channelId: string;
}
async function getChannel(params: GetChannelParams): Promise<DetailedChannel | null>;

// From: utils/ai/tools/oracle/getUser.ts
interface GetUserParams {
  guild: Guild;
  userId: string;
}
async function getUser(params: GetUserParams): Promise<DetailedUser | null>;
```

### `searchMessages` / `searchUsers` / `listChannels`

```typescript { .api }
// From: utils/ai/tools/oracle/searchMessages.ts
interface SearchMessagesParams {
  guild: Guild;
  query?: string;
  channelId?: string;
  limit?: number;
}
interface MessageSearchResult {
  message: SerializedMessage;
  score: number;  // -1 for no query (all messages), 0-1 for fuzzy match quality
}
interface SearchMessagesResult {
  results: MessageSearchResult[];
  totalSearched: number;
  truncated: boolean;
  warning?: string;
}
async function searchMessages(params: SearchMessagesParams): Promise<SearchMessagesResult>;

// From: utils/ai/tools/oracle/searchUsers.ts
interface SearchUsersParams {
  guild: Guild;
  query?: string;
  limit?: number;
}
interface UserSearchResult {
  user: SerializedUser;
  score: number;
}
interface SearchUsersResult {
  results: UserSearchResult[];
  totalMembers: number;
  truncated: boolean;
  warning?: string;
}
async function searchUsers(params: SearchUsersParams): Promise<SearchUsersResult>;

// From: utils/ai/tools/oracle/listChannels.ts
interface ListChannelsParams {
  guild: Guild;
  query?: string;
  limit?: number;
}
interface ChannelSearchResult {
  channel: SerializedChannel;
  score: number;
}
interface ListChannelsResult {
  results: ChannelSearchResult[];
  totalChannels: number;
  truncated: boolean;
}
async function listChannels(params: ListChannelsParams): Promise<ListChannelsResult>;
```

### Fuzzy Search Utilities

```typescript { .api }
// From: utils/ai/tools/oracle/fuzzy.ts
interface FuzzySearchOptions<T> {
  items: T[];
  keys: (keyof T | string)[];  // Object keys to search on
  query: string;
  limit: number;
}
interface FuzzyResult<T> {
  item: T;
  score: number;  // 0-1 score; empty query returns score: 1 for all
}

/**
 * Fuzzy search using fuzzysort library
 * If query is empty/whitespace, returns first `limit` items with score 1
 */
function fuzzySearch<T>(options: FuzzySearchOptions<T>): FuzzyResult<T>[];

/**
 * Simple case-insensitive substring filter
 * If query is empty, returns first `limit` items
 */
function filterByQuery<T>(
  items: T[],
  query: string,
  getter: (item: T) => string,  // Function to get searchable string from item
  limit: number,
): FuzzyResult<T>[];
```

### Channel Utilities

```typescript { .api }
// From: utils/ai/tools/oracle/channelUtils.ts
type TextBasedGuildChannel = TextChannel | NewsChannel | ThreadChannel;

// Type guard: checks if a channel is text-based (GuildText, GuildAnnouncement, threads)
function isTextBasedChannel(channel: unknown): channel is TextBasedGuildChannel;

// Get string name for a ChannelType enum value
function getChannelTypeName(type: ChannelType): string;
```
