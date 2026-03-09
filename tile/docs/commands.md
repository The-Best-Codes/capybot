# Slash Commands

CapyBot registers six slash commands. All commands follow the discraft pattern: a default export with a `data` (SlashCommandBuilder) and `execute` function.

## Command Structure

```typescript { .api }
// All commands follow this export pattern
export default {
  data: SlashCommandBuilder;
  execute(data: { interaction: ChatInputCommandInteraction }): Promise<void>;
};
```

---

## Capabilities

### `/ping`

Simple health check. No authentication required.

```typescript { .api }
// Command: /ping
// File: commands/ping.ts
// Auth: none required

// Replies with: "Pong!"
```

---

### `/dev_login`

Developer authentication command. Handles login, status, and logout.

```typescript { .api }
// Command: /dev_login [action]
// File: commands/devlogin.ts
// Auth: none required (it IS the auth command)

// Options:
// action: "login" | "status" | "logout"  (default: "login")
```

**Behavior by action:**
- `login`: If already logged in, shows status. Otherwise, shows a modal for key entry.
- `status`: Shows current session info (username, expiry). Error if not logged in.
- `logout`: Clears session. Responds differently based on whether they were logged in.

**Exported helpers (also used by `events/interactionCreate.ts`):**

```typescript { .api }
export const DEV_LOGIN_MODAL_ID: string;
// "dev_login_modal" - customId for the login modal

export const DEV_KEY_INPUT_ID: string;
// "dev_key_input" - customId for the key text input

/**
 * Creates a ModalBuilder for developer key entry
 */
export function createLoginModal(): ModalBuilder;

/**
 * Handles the modal submit interaction for developer login
 * Validates key, saves session on success, replies with result
 */
export async function handleLoginModal(interaction: ModalSubmitInteraction): Promise<void>;
```

**Modal behavior:**
- Presents a `TextInputStyle.Short` field for the developer key
- On valid key: saves session, replies with success + expiry info (ephemeral)
- On invalid key: replies with specific error message (ephemeral):
  - `"Invalid developer key. Please check and try again."` (invalid_signature)
  - `"This developer key has expired. Please request a new one."` (expired)
  - `"This key was issued for a different user. Please use your own key."` (wrong_user)
  - `"This developer key has been revoked. Please request a new one."` (revoked)

---

### `/dev_analytics`

View bot analytics. Requires `dev_slash_commands` permission.

```typescript { .api }
// Command: /dev_analytics [period] [category]
// File: commands/devanalytics.ts
// Auth: dev_slash_commands permission required

// Options:
// period: "today" | "7days" | "30days" | "90days"  (default: "7days")
// category: "overview" | "commands" | "messages" | "ai" | "events" | "users"  (default: "overview")
```

**Response:** Ephemeral Discord embed with analytics data.

**Category content:**
- `overview`: Commands (total/success rate/avg time), Messages (total/processed/avg response), AI (generations/success/tokens/avg time), Events (total)
- `commands`: Command totals, success rate, avg execution time, top 10 commands
- `messages`: Total messages, processed count, response rate, avg response time, top 10 process reasons
- `ai`: Total generations, success rate, avg time, total tokens, model breakdown, top 10 tools used
- `events`: Total events, top 15 event types
- `users`: Top 10 most active users by message + command count

---

### `/dev_context`

Get the full AI context JSON for a message. Requires `dev_slash_commands` permission.

```typescript { .api }
// Command: /dev_context [message_id]
// File: commands/devcontext.ts
// Auth: dev_slash_commands permission required

// Options:
// message_id: string (optional)
//   - Can be a message ID or a Discord message URL (extracts ID automatically)
//   - Defaults to the latest message in the channel if not provided
```

**Response:** Ephemeral reply with the context JSON as a downloadable file attachment named `context_<messageId>.json`.

**Notes:**
- Only works in server text channels (not DMs or group DMs)
- Returns the full JSON output of `buildContext(message)` as a file

---

### `/dev_flex`

Flex developer status publicly. Requires `dev_slash_commands` permission.

```typescript { .api }
// Command: /dev_flex
// File: commands/devflex.ts
// Auth: dev_slash_commands permission required

// Replies publicly: "<displayName> has CapyBot developer access. So cool! ✨"
// Uses guild nickname if available, falls back to displayName, then username
```

---

### `/dev_toolcalls`

View AI tool calls for a message. Requires `dev_slash_commands` permission.

```typescript { .api }
// Command: /dev_toolcalls [message_id]
// File: commands/devtoolcalls.ts
// Auth: dev_slash_commands permission required

// Options:
// message_id: string (optional)
//   - Can be a message ID or a Discord message URL (extracts ID automatically)
//   - Defaults to the latest message in the channel if not provided
```

**Response:** Ephemeral reply with formatted tool call details.

**Format per tool call (Discord markdown):**

Each tool call is rendered as:
- Bold header: `**<index>. <toolName>**` (with ❌ suffix if error)
- JSON code block containing the input parameters
- Optional `**Output:**` section with JSON code block (if tool succeeded)
- Optional `**Error:** <message>` line (if tool errored)

**Notes:**
- Replies `"No tool calls found for this message."` if none exist
- Truncates response at 1900 characters with `[...truncated]` if too long
- Ensures code block tags are properly closed when truncating
