# Create a `guildMemberAdd` Event Handler

Implement a Discord event handler that fires whenever a new member joins a guild. When triggered, the handler should send a welcome message `"Welcome to the server, {member.displayName}!"` to the guild's system channel (if one is configured).

The handler must follow the discraft event module export pattern so it is auto-discovered and registered at startup.

## Capabilities { .capabilities }

### Event module structure

The exported module must contain:
- An `event` property set to the appropriate Discord.js event name for new guild member arrivals.
- A `handler` async function that receives the Discord client as its first argument and the guild member as its second argument.

### Welcome message behavior

- If the guild has a system channel, send the welcome message to it.
- If the guild has no system channel, do nothing.

### Test cases

- The exported `event` value equals the Discord.js constant for the "guildMemberAdd" event [@test](./tests/memberJoin.test.ts)
- When a member with `displayName = "Capybara"` joins and a system channel exists, the system channel receives `"Welcome to the server, Capybara!"` [@test](./tests/memberJoin.test.ts)
- When no system channel is configured, no message is sent [@test](./tests/memberJoin.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the event handler module pattern, discraft auto-discovery, and discord.js integration.
