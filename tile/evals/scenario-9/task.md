# Implement the Oracle Tool for Discord Entity Lookup

Implement an `oracle` AI tool that allows the bot to query Discord guild entities at runtime. The tool accepts a single `action` parameter (`"messages"`, `"channels"`, or `"users"`) plus action-specific parameters, and returns a JSON-serializable result object.

## Capabilities { .capabilities }

### Tool definition

Define the tool using the Vercel AI SDK's `tool()` helper with a zod schema. The tool receives `guild` and a relevant `channel` (for message lookups) via closure.

### Actions

**messages**
- If `id` is provided: fetch the message by ID from the specified channel and return its content, author, timestamp, reactions, embeds, and attachment count.
- If `query` is provided: search up to the last 100 messages in the channel (or in all text channels if no channel is specified) using fuzzy matching on content and author username. Return up to `limit` results (default 10).

**channels**
- If `id` is provided: return the channel's name, type, topic, position, and member count.
- If `query` is provided: fuzzy-search guild channels by name and return up to `limit` results (default 10).

**users**
- If `id` is provided: return the member's username, display name, roles, joined-at date, and presence status.
- If `query` is provided: fuzzy-search guild members by username, display name, and role names. Return up to `limit` results (default 10).

### Test cases

- With action `"channels"` and `id` set, returns an object with at least `name` and `type` fields [@test](./tests/oracle.test.ts)
- With action `"messages"` and `query` set, returns an array of results with `content` field [@test](./tests/oracle.test.ts)
- With action `"users"` and `query` set, fuzzy-matches against username and displayName [@test](./tests/oracle.test.ts)
- When a message ID is not found, returns an error object instead of throwing [@test](./tests/oracle.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the oracle tool pattern for runtime Discord entity lookup using Vercel AI SDK tool definitions and fuzzy search.
