# Configure the Discord Client with Required Intents and Partials

Create and export a Discord client instance configured to:

1. Receive guild messages and their content (required for reading message text).
2. Access guild members and their information.
3. Receive direct messages, including partial channel/message support for DMs.

The exported client must be a singleton used throughout the application.

## Capabilities { .capabilities }

### Intent configuration

The client must be instantiated with the following gateway intents:
- `Guilds`
- `GuildMessages`
- `MessageContent`
- `GuildMembers`
- `DirectMessages`

### Partial configuration

To support DMs properly, the client must include these partials:
- `Channel`
- `Message`

### Test cases

- The exported client has `GatewayIntentBits.MessageContent` in its options intents [@test](./tests/discordClient.test.ts)
- The exported client has `GatewayIntentBits.DirectMessages` in its options intents [@test](./tests/discordClient.test.ts)
- The exported client has `Partials.Channel` in its options partials [@test](./tests/discordClient.test.ts)
- The same client instance is returned on multiple imports (singleton) [@test](./tests/discordClient.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the discord.js client setup pattern with required intents and partials for full message and DM support.
