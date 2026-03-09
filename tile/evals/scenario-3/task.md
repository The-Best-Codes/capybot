# Configure an OpenAI-Compatible AI Provider

Set up an AI provider module that creates an OpenAI-compatible language model client reading its configuration from environment variables. Export two model instances: one for general conversation and one for attachment analysis.

## Capabilities { .capabilities }

### Provider setup

Create an OpenAI-compatible provider using:
- Base URL from `process.env.AI_BASE_URL`
- API key from `process.env.AI_API_KEY`
- A provider name of `"custom-ai"`

### Model exports

Export the following named values:
- `globalModel`: a model instance using `process.env.AI_GLOBAL_MODEL` (default: `"default-model"` if the variable is unset)
- `attachmentModel`: a model instance using `process.env.AI_ATTACHMENT_MODEL` (default: `"attachment-model"` if the variable is unset)

### Test cases

- When `AI_BASE_URL` is `"https://api.example.com/v1"` and `AI_API_KEY` is `"test-key"`, the provider is created without error [@test](./tests/aiClient.test.ts)
- `globalModel` uses `process.env.AI_GLOBAL_MODEL` when set [@test](./tests/aiClient.test.ts)
- `attachmentModel` uses `process.env.AI_ATTACHMENT_MODEL` when set [@test](./tests/aiClient.test.ts)
- When env vars are unset, the model IDs fall back to the specified defaults [@test](./tests/aiClient.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the AI client configuration pattern using `@ai-sdk/openai-compatible` with environment-variable-driven model selection.
