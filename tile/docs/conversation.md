# Conversation Management

The `conversationManager` singleton tracks per-channel state to decide when the bot should respond to messages. It implements a "hot window" system where the bot is more responsive immediately after an interaction.

## Capabilities

### Conversation Manager

```typescript { .api }
// From: utils/conversation/manager.ts
// Import: import { conversationManager } from "./utils/conversation/manager";

class ConversationManager {
  /**
   * Update whether the bot is currently generating a response for a channel
   * Call with true when starting generation, false when done (or on error)
   */
  setGenerating(channelId: string, isGenerating: boolean): void;

  /**
   * Record that the bot sent a message in a channel (marks the channel as "hot")
   * @param channelId - The channel where interaction occurred
   * @param userId - The Discord user ID the bot interacted with
   */
  markInteraction(channelId: string, userId: string): void;

  /**
   * Determine whether the bot should process and respond to a message
   *
   * @param message - The Discord message to evaluate
   * @param botId - The bot's Discord user ID
   * @param isMentioned - Whether the bot was @mentioned in the message
   * @param isReplyToBot - Whether the message is a reply to one of the bot's messages
   * @returns Object with process boolean and reason string
   */
  shouldProcess(
    message: Message,
    botId: string,
    isMentioned: boolean,
    isReplyToBot: boolean,
  ): { process: boolean; reason: string };
}

export const conversationManager: ConversationManager;
```

---

### Response Decision Logic

`shouldProcess` evaluates messages through several checks in order:

```typescript { .api }
// Return reasons when process: true
type TrueReason =
  | "explicit_ping"       // Bot was @mentioned or message is a reply to bot
  | "keyword_trigger"     // Message contains trigger keyword (case-insensitive: "capybot")
  | "random_overhear"     // 2% random chance (only for messages > 10 chars)
  | "direct_followup"     // Hot window: same user who triggered bot's last interaction
  | "quick_reaction_from_other"; // Hot window: different user within 5 seconds

// Return reasons when process: false
type FalseReason =
  | "busy_generating"             // Bot is currently generating a response in this channel
  | "cold_channel"                // No recent bot activity in channel
  | "cold_channel_distance"       // Bot spoke, but not in last 5 messages
  | "interruption_outside_window"; // Different user, more than 5s after bot's response
```

**Decision flow:**

1. **Always process:** `isMentioned === true` OR `isReplyToBot === true` → `"explicit_ping"`
2. **Keyword check:** Message contains `"capybot"` (case-insensitive) → `"keyword_trigger"`
3. **Random overhear:** `message.content.length > 10` AND `Math.random() < 0.02` → `"random_overhear"`
4. **Hot window checks** (only if channel has recent bot interaction):
   - If `isGenerating === true` → `"busy_generating"` (false)
   - If `Date.now() - lastBotMessageTime >= 10000ms` → `"cold_channel"` (false)
   - If bot is NOT in the last 5 messages → `"cold_channel_distance"` (false)
   - If same user as `lastRepliedToUserId` → `"direct_followup"` (true)
   - If `Date.now() - lastBotMessageTime < 5000ms` → `"quick_reaction_from_other"` (true)
   - Otherwise → `"interruption_outside_window"` (false)
5. **Default:** `"cold_channel"` (false)

---

### Configuration Constants

```typescript
// Hardcoded in utils/conversation/manager.ts
const CONFIG = {
  HOT_WINDOW_MS: 10_000,        // 10 seconds: time window after bot response
  REACTION_WINDOW_MS: 5_000,    // 5 seconds: quick reaction sub-window
  OVERHEAR_RATE: 0.02,          // 2% chance to "overhear" random messages
  TRIGGER_KEYWORDS: ["capybot"], // Keywords that always trigger a response
  MAX_MESSAGE_DISTANCE: 5,       // Bot must appear in last N messages for hot window
};
```

---

### Usage in Message Handler

```typescript
import { conversationManager } from "./utils/conversation/manager";

// In messageCreate event:
const decision = conversationManager.shouldProcess(
  message,
  client.user.id,
  isMentioned,
  isReplyToBot,
);

if (!decision.process) {
  // Log the reason and skip
  return;
}

try {
  conversationManager.setGenerating(message.channelId, true);

  // ... generate AI response ...

  conversationManager.markInteraction(message.channelId, message.author.id);
} catch (error) {
  conversationManager.setGenerating(message.channelId, false);
}
```
