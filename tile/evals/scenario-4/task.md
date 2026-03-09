# Generate an AI Response with Multi-Step Tool Calling

Implement a function `generateBotResponse` that takes a system prompt string, an array of messages, and a tools record, then uses the Vercel AI SDK to generate a text response. The function must allow up to 10 tool execution steps.

After generation, check whether the result text contains the literal string `[[IGNORE]]`. If it does, return `null`. Otherwise return the result text.

## Capabilities { .capabilities }

### Function signature

```ts
async function generateBotResponse(
  systemPrompt: string,
  messages: CoreMessage[],
  tools: Record<string, CoreTool>
): Promise<string | null>
```

### Generation behavior

- Call `generateText` from the `ai` package with the provided `system`, `messages`, and `tools`.
- Set `maxSteps` to `10`.
- Use a pre-configured global model (imported from the AI client module).

### Result processing

- If the generated text contains the substring `[[IGNORE]]`, return `null`.
- Otherwise return the full generated text.

### Test cases

- When the model returns `"Hello there!"`, the function returns `"Hello there!"` [@test](./tests/generateBotResponse.test.ts)
- When the model returns `"[[IGNORE]] some text"`, the function returns `null` [@test](./tests/generateBotResponse.test.ts)
- `generateText` is called with `maxSteps: 10` [@test](./tests/generateBotResponse.test.ts)
- `generateText` is called with the provided system prompt and messages [@test](./tests/generateBotResponse.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the AI text generation pattern using the Vercel AI SDK's `generateText` with tool calling and the `[[IGNORE]]` response directive.
