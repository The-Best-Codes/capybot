# Implement Conversation Decision Logic

Implement a `shouldProcess` function that determines whether the bot should respond to a Discord message. The function returns `true` (process) or `false` (skip) based on the following ordered rules:

1. **Explicit ping**: The message mentions the bot user → always process.
2. **Reply to bot**: The message is a reply to one of the bot's messages → always process.
3. **Keyword trigger**: The message content contains the word `"capybot"` (case-insensitive) → always process.
4. **Hot window**: The bot sent a message in the same channel within the last 10 seconds:
   - If the message author is the same user the bot last replied to (within the last 5 messages), process.
   - If any other user sent the message within 5 seconds of the bot's last message, process.
5. **Random overhear**: 2% chance to process a message longer than 10 characters.
6. Otherwise: do not process.

## Capabilities { .capabilities }

### Function signature

```ts
function shouldProcess(message: Message, botUserId: string, lastBotMessageTime: number, lastBotReplyTargetId: string | null): boolean
```

### Test cases

- A message that mentions the bot user ID returns `true` [@test](./tests/shouldProcess.test.ts)
- A message replying to the bot's own message returns `true` [@test](./tests/shouldProcess.test.ts)
- A message containing `"capybot"` (any case) returns `true` [@test](./tests/shouldProcess.test.ts)
- A message sent 3 seconds after the bot's last message, from the last reply target user, returns `true` [@test](./tests/shouldProcess.test.ts)
- A message with no triggers and content length ≤ 10 never returns `true` from random overhear [@test](./tests/shouldProcess.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the conversation decision logic used by the message event handler to decide whether the bot should respond.
