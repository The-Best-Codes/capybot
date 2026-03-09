# Implement File-Based Tool Call Persistence

Implement a `ToolCallsDb` module that persists AI tool call records to disk, keyed by Discord message ID. Each record is stored in a JSON file at `data/tool_calls/{messageId}.json`.

## Capabilities { .capabilities }

### Interface

```ts
interface ToolCallRecord {
  toolName: string;
  input: unknown;
  output?: string;
  error?: string;
  step: number;
  timestamp: string;    // ISO date string
  executionTime: number; // milliseconds
}

const toolCallsDb = {
  async saveToolCall(messageId: string, record: ToolCallRecord): Promise<void>,
  async getToolCalls(messageId: string): Promise<ToolCallRecord[]>,
  async cleanup(): Promise<void>,  // deletes files older than 30 days
}
```

### Persistence behavior

- `saveToolCall`: If the file already exists, load its array and push the new record; otherwise create a new array. Write the result back to disk.
- `getToolCalls`: Return the array from the file, or `[]` if the file does not exist.
- `cleanup`: Delete any `data/tool_calls/*.json` file whose records are all older than 30 days (based on the `timestamp` field of the first record).

### Test cases

- `saveToolCall("msg1", record)` creates `data/tool_calls/msg1.json` containing an array with the record [@test](./tests/toolCallsDb.test.ts)
- Calling `saveToolCall` twice with the same message ID results in an array of two records [@test](./tests/toolCallsDb.test.ts)
- `getToolCalls("nonexistent")` returns `[]` without throwing [@test](./tests/toolCallsDb.test.ts)
- `cleanup()` deletes files where the first record's timestamp is more than 30 days ago [@test](./tests/toolCallsDb.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the file-based tool call persistence layer used to store and retrieve AI tool invocation history per Discord message.
