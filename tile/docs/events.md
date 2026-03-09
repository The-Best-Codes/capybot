# Discord Event Handlers

CapyBot handles four Discord events using the discraft pattern. Each event file is a default export with an `event` (Events enum value) and `handler` function.

## Event Handler Structure

```typescript { .api }
// All events follow this export pattern
export default {
  event: Events;  // Discord.js Events enum value
  handler(client: Client, ...args: any[]): void | Promise<void>;
};
```

---

## Capabilities

### `Events.ClientReady` (`events/ready.ts`)

Fires when the Discord client successfully connects and is ready.

```typescript { .api }
// Triggered by: client login success
// Handler signature: (client: Client) => void

// Actions performed:
// 1. Tracks ClientReady event in analytics
// 2. Sets bot presence to:
//    - Activity type: Custom
//    - Name: "chilling"
//    - State: "chillin' like a capybot"
//    - Status: "online"
```

---

### `Events.Error` (`events/error.ts`)

Fires when the Discord client encounters an error.

```typescript { .api }
// Triggered by: Discord.js client errors
// Handler signature: (client: Client, error: Error) => void

// Actions performed:
// 1. Tracks Error event in analytics with error message metadata
// 2. Logs the error via logger.error()
```

---

### `Events.InteractionCreate` (`events/interactionCreate.ts`)

Fires when any Discord interaction is created (slash commands, modals, etc.).

```typescript { .api }
// Triggered by: Any Discord interaction
// Handler signature: (_client: Client, interaction: Interaction) => Promise<void>

// Actions performed:
// 1. Tracks InteractionCreate event in analytics

// For ChatInputCommand interactions:
// 2. Tracks command analytics (commandName, userId, username, guildId, channelId, success: true, options)

// For ModalSubmit interactions with customId === DEV_LOGIN_MODAL_ID:
// 3. Calls handleLoginModal(interaction) to process developer login
```

**Notes:**
- Command analytics are always tracked as `success: true` at this stage (failure tracking would require wrapping command execution)
- Options are only included if the interaction is a `ChatInputCommand` with at least one option value

---

### `Events.MessageCreate` (`events/messageCreate.ts`)

The main AI response pipeline. Fires for every new message the bot can see.

```typescript { .api }
// Triggered by: Any new message in monitored channels
// Handler signature: (client: Client, message: Message<boolean>) => Promise<void>
```

**Full processing pipeline:**

1. **Track event**: Records `messageCreate` in analytics
2. **Skip bots**: Ignores all messages from bot accounts
3. **DM auth check**: In DMs, requires developer authentication (via `checkDevAuth`) and the `dm` permission
   - Rejects unauthenticated users (not logged in): `"Sign in as a CapyBot developer..."`
   - Rejects users without `dm` permission: `"Your developer key does not have permission..."`
4. **Reply detection**: Checks if the message is a reply to the bot's message
5. **Decision**: Calls `conversationManager.shouldProcess()` to determine if processing is needed
6. **Skip if not processing**: Tracks message analytics with `responseGenerated: false`
7. **Start generation**:
   - Calls `conversationManager.setGenerating(channelId, true)`
   - Sends typing indicator for explicit pings/keyword triggers
8. **Build context**: Calls `buildContext(message)` to get JSON context string
9. **AI generation**: Calls `generateText` with `globalModel`, system instructions, tools, and `stopWhen: stepCountIs(MAX_TOOL_STEPS)`
10. **Handle IGNORE_PHRASE**: If `[[IGNORE]]` in response, exits without sending (tracks analytics as `decisionReason: "ignored"`)
11. **Handle REPLY_PHRASE**: Parses `[[REPLY:message_id]]` or `[[REPLY:NONE]]` from response
12. **Save tool calls**: Persists all tool calls from all steps to `toolCallStore`
13. **Send response**:
    - If `replyTarget` is a message: uses `replyTarget.reply({ content, allowedMentions: { repliedUser: false, parse: [] } })`
    - If `replyTarget` is null: uses `channel.send({ content, allowedMentions: { parse: [] } })`
14. **Track analytics**: Records both message and AI analytics
15. **Mark interaction**: Calls `conversationManager.markInteraction(channelId, userId)`

**Error handling:**
- Logs error, tracks message analytics with `responseGenerated: false` and error string
- Calls `conversationManager.setGenerating(channelId, false)` on error

**Note on DM behavior:** In DMs, `isReplyToBot` is always set to `true`, ensuring the bot always processes DM messages (subject to auth checks).
