# Create a `/greet` Slash Command

Implement a Discord slash command named `greet` that accepts a required string option called `name` and replies with the message `"Hello, {name}! Welcome to the server."`.

The command must follow the module export pattern used by the discraft framework so it is auto-discovered and registered at startup.

## Capabilities { .capabilities }

### Slash command structure

The exported module must contain:
- A `data` property built with the slash command builder, setting the command name to `greet`, its description to `"Greet a user by name"`, and adding a required string option named `name` with description `"The name to greet"`.
- An `execute` async function that receives `{ interaction }` and replies with the greeting string.

### Test cases

- When `name` is `"Alice"`, the reply text is `"Hello, Alice! Welcome to the server."` [@test](./tests/greet.test.ts)
- When `name` is `"Bob"`, the reply text is `"Hello, Bob! Welcome to the server."` [@test](./tests/greet.test.ts)
- The exported `data.name` equals `"greet"` [@test](./tests/greet.test.ts)
- The string option named `"name"` is marked as required [@test](./tests/greet.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the slash command module pattern, discraft auto-discovery, and discord.js integration.
