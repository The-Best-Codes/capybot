# Tool Calls Database

CapyBot persists AI tool call history per Discord message using a simple file-based store. Data is stored in `data/tool_calls/<messageId>.json` with a 30-day retention period enforced by daily cleanup.

## Capabilities

### Tool Call Store

```typescript { .api }
// From: utils/db/toolCallsDb.ts
// Import: import { toolCallStore, type ToolCall } from "./utils/db/toolCallsDb";

interface ToolCall {
  toolCallId: string;             // Unique ID assigned by the AI SDK
  toolName: string;               // Name of the tool called
  input: Record<string, any>;     // Tool input parameters
  output?: Record<string, any> | null;  // Tool output (undefined if error)
  isError?: boolean;              // Whether the tool call resulted in an error
  error?: string;                 // Error message (if isError is true)
  stepNumber: number;             // Which AI generation step this call occurred in (0-indexed)
  timestamp: number;              // Unix milliseconds when the call was recorded
  executionTime?: number;         // Execution duration in milliseconds
}

class ToolCallStore {
  /**
   * Initialize storage directory (auto-called on first use)
   */
  initialize(): Promise<void>;

  /**
   * Persist tool calls for a message
   * No-op if toolCalls array is empty
   *
   * @param messageId - Discord message ID (used as file name)
   * @param toolCalls - Array of tool call records to save
   */
  save(messageId: string, toolCalls: ToolCall[]): Promise<void>;

  /**
   * Retrieve tool calls for a message
   * Returns empty array if no records exist
   *
   * @param messageId - Discord message ID
   */
  get(messageId: string): Promise<ToolCall[]>;
}

export const toolCallStore: ToolCallStore;
```

---

### File Structure

```
data/tool_calls/
  <messageId>.json   # One file per message with tool calls
```

**File format:**

```json
{
  "messageId": "1234567890123456789",
  "toolCalls": [
    {
      "toolCallId": "call_abc123",
      "toolName": "oracle",
      "input": { "action": "users", "query": "john" },
      "output": { "success": true, "results": [...] },
      "isError": false,
      "stepNumber": 0,
      "timestamp": 1700000000000
    }
  ],
  "savedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Retention Policy

- Tool call records are automatically pruned after **30 days**
- Cleanup runs daily, scheduled at midnight (next midnight after bot startup)
- Records are pruned at the individual tool call level (not the whole file)
- Files with no remaining records are deleted

---

### Usage in Context Building

The tool call store is used by `buildContext()` to enrich message history with historical tool call data:

```typescript
import { toolCallStore } from "./utils/db/toolCallsDb";

// During context building, tool calls are attached to history entries
const historyWithTools = await Promise.all(
  history.map(async (msg) => {
    const tools = await toolCallStore.get(msg.id);
    if (tools && tools.length > 0) {
      return { ...msg, tool_calls: JSON.stringify(tools) };
    }
    return msg;
  }),
);
```

### Usage in Message Handler

```typescript
import { toolCallStore, type ToolCall } from "./utils/db/toolCallsDb";

// After AI generation, save tool calls
const allToolCalls: ToolCall[] = result.steps.flatMap((step, stepIndex) =>
  step.toolCalls.map((tc) => ({
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    input: tc.input,
    output: /* from step.toolResults */,
    isError: false,
    stepNumber: stepIndex,
    timestamp: Date.now(),
  }))
);

if (allToolCalls.length > 0) {
  await toolCallStore.save(message.id, allToolCalls);
}

// Later, retrieve tool calls
const toolCalls = await toolCallStore.get(messageId);
```
