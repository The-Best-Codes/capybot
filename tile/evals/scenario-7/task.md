# Implement Developer Key Validation with HMAC-SHA256

Implement a `validateDevKey` function that verifies a developer key string. Keys are structured as two Base64URL-encoded parts separated by a dot: `base64url(payload).base64url(signature)`.

The payload is a JSON object with the fields: `username` (string), `expiry` (ISO date string or `null` for permanent), `nonce` (string), and `permissions` (string array).

Validation must:
1. Split the key on `.` to get payload and signature parts.
2. Decode and parse the payload JSON.
3. Recompute the HMAC-SHA256 signature of the raw payload string using the secret from `process.env.DEV_KEY_SECRET`.
4. Reject the key if the recomputed signature does not match the provided signature.
5. Reject the key if `expiry` is set and the current date is past the expiry.
6. Return the decoded payload object if all checks pass, or `null` if any check fails.

## Capabilities { .capabilities }

### Function signature

```ts
async function validateDevKey(key: string): Promise<{ username: string; expiry: string | null; nonce: string; permissions: string[] } | null>
```

### Test cases

- A correctly signed, non-expired key returns the payload object [@test](./tests/devAuth.test.ts)
- A key with a tampered payload (signature mismatch) returns `null` [@test](./tests/devAuth.test.ts)
- A key where `expiry` is a past ISO date returns `null` [@test](./tests/devAuth.test.ts)
- A key where `expiry` is `null` (permanent) never expires [@test](./tests/devAuth.test.ts)

## Dependencies { .dependencies }

### capybot version 0.2.0-beta.2 { .dependency }

An AI-powered Discord bot framework providing the HMAC-SHA256 developer key validation pattern used to authenticate developers interacting with privileged bot commands.
