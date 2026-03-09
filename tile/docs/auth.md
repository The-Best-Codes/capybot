# Developer Authentication

CapyBot uses an HMAC-signed key system for developer access. Developer keys grant access to developer slash commands and/or DM functionality. Keys are managed via CLI and validated at runtime via session storage.

## Capabilities

### Developer Permissions

```typescript { .api }
// From: utils/auth/permissions.ts

/** Available developer permission types */
type DevPermission = "dm" | "dev_slash_commands";

/** Human-readable descriptions for each permission */
const PERMISSION_DESCRIPTIONS: Record<DevPermission, string>;
// "dm": "Allow sending and receiving DMs with the bot"
// "dev_slash_commands": "Allow using developer slash commands"

/** All available permissions */
const ALL_PERMISSIONS: DevPermission[];
// ["dm", "dev_slash_commands"]

/**
 * Check if a permissions array includes a specific permission
 * Returns false if permissions is undefined or empty
 */
function hasPermission(
  permissions: DevPermission[] | undefined,
  permission: DevPermission,
): boolean;
```

**Usage:**

```typescript
import { hasPermission } from "./utils/auth/permissions";

if (hasPermission(authResult.permissions, "dm")) {
  // User can use DMs
}
if (hasPermission(authResult.permissions, "dev_slash_commands")) {
  // User can use developer slash commands
}
```

---

### Key Types

```typescript { .api }
// From: utils/auth/devAuth.ts

interface KeyValidationResult {
  valid: boolean;
  error?: "invalid_signature" | "expired" | "wrong_user" | "revoked";
  username?: string;
  expiresAt?: number | null;     // Unix milliseconds, null = never expires
  daysRemaining?: number | null; // null = never expires
  permissions?: DevPermission[];
}

interface KeyInfo {
  valid: boolean;
  username?: string;
  expiresAt?: number | null;
  neverExpires?: boolean;
  expired?: boolean;
  revoked?: boolean;
  error?: string;
  permissions?: DevPermission[];
}
```

---

### Key Generation

```typescript { .api }
// From: utils/auth/devAuth.ts

/**
 * Generate a new HMAC-signed developer key
 * Requires DEV_AUTH_SECRET environment variable to be set
 *
 * @param username - Discord username (without @)
 * @param expirationDays - Days until expiration; undefined = never expires
 * @param permissions - List of permissions to grant
 * @returns Base64url-encoded key string (format: "<payload>.<signature>")
 * @throws Error if DEV_AUTH_SECRET is not set
 */
function generateDevKey(
  username: string,
  expirationDays?: number,
  permissions?: DevPermission[],
): string;
```

**Usage:**

```typescript
import { generateDevKey } from "./utils/auth/devAuth";

// Never-expiring key with full permissions
const key = generateDevKey("myuser", undefined, ["dm", "dev_slash_commands"]);

// 30-day key with only DM permission
const dmKey = generateDevKey("myuser", 30, ["dm"]);
```

---

### Key Validation and Info

```typescript { .api }
// From: utils/auth/devAuth.ts

/**
 * Check if a key is in the revoked keys list
 */
function isKeyRevoked(key: string): boolean;

/**
 * Get detailed information about a key without session context
 * Does not require a Discord username - just inspects the key payload
 */
function getKeyInfo(key: string): KeyInfo;

/**
 * Validate a key for a specific Discord user
 * Checks signature, expiration, username match, and revocation status
 *
 * @param key - The developer key string
 * @param discordUsername - The Discord username to validate against (case-insensitive, strips @)
 */
function validateDevKey(key: string, discordUsername: string): KeyValidationResult;
```

**Validation errors:**
- `"invalid_signature"` - HMAC signature mismatch or malformed key
- `"expired"` - Key has passed its expiration date
- `"wrong_user"` - Key username doesn't match provided Discord username
- `"revoked"` - Key is in the revoked keys list

---

### Key Revocation

```typescript { .api }
// From: utils/auth/devAuth.ts

/**
 * Add a key to the revoked keys list and remove any active sessions using it
 * @returns false if key was already revoked, true if newly revoked
 */
function revokeKey(key: string): boolean;

/**
 * Revoke all active sessions for a Discord username
 * Revokes the key for each session found
 * @returns Number of sessions revoked
 */
function revokeUserSessions(username: string): number;
```

---

### Session Management

Sessions are persisted to `data/dev_sessions.json`. Each Discord user ID maps to a session containing the key and login timestamp.

```typescript { .api }
// From: utils/auth/devAuth.ts

/**
 * Save a developer session for a Discord user
 * Overwrites any existing session for the same user ID
 */
function saveSession(discordUserId: string, key: string): void;

/**
 * Get the current session for a Discord user
 * @returns Session object or null if no session exists
 */
function getSession(discordUserId: string): {
  key: string;
  loginTime: number;  // Unix milliseconds
} | null;

/**
 * Clear (logout) a developer session
 */
function clearSession(discordUserId: string): void;

/**
 * Check if a Discord user is currently authenticated as a developer
 * Validates the stored session key against the user's current username
 * Auto-clears invalid sessions
 *
 * @returns KeyValidationResult with additional loggedIn flag
 */
function checkDevAuth(
  discordUserId: string,
  discordUsername: string,
): KeyValidationResult & { loggedIn: boolean };
```

**Usage example:**

```typescript
import { checkDevAuth } from "./utils/auth/devAuth";
import { hasPermission } from "./utils/auth/permissions";

// Check if a user is authenticated
const authResult = checkDevAuth(message.author.id, message.author.username);

if (!authResult.loggedIn) {
  // Not authenticated
  return;
}

if (!hasPermission(authResult.permissions, "dm")) {
  // Missing DM permission
  return;
}

// User is authenticated and has DM permission
console.log(`Authenticated user: ${authResult.username}`);
```

---

### Developer Command Guard

Guard function for slash commands that require developer authentication.

```typescript { .api }
// From: utils/auth/devCommandGuard.ts

/**
 * Verify developer authentication for a slash command interaction
 * Automatically sends ephemeral error replies for auth failures
 *
 * @returns true if authenticated with dev_slash_commands permission, false otherwise
 */
async function requireDevAuth(
  interaction: ChatInputCommandInteraction
): Promise<boolean>;
```

**Error messages sent to user:**
- Not logged in: `"This command requires developer authentication. Please login first."`
- Expired session: `"Your developer session has expired. Please login again with a new key."`
- Username mismatch: `"Your session is invalid (username mismatch). Please login again."`
- Missing permission: `"Your developer key does not have permission to use developer slash commands..."`

**Usage example:**

```typescript
import { requireDevAuth } from "./utils/auth/devCommandGuard";

export default {
  data: new SlashCommandBuilder().setName("my_dev_command").setDescription("Dev only"),

  async execute({ interaction }) {
    const isAuthed = await requireDevAuth(interaction);
    if (!isAuthed) return;  // Error reply already sent

    // Proceed with developer-only logic
    await interaction.reply("You are authenticated!");
  }
};
```

---

### Data File Locations

| File | Description |
|------|-------------|
| `data/dev_sessions.json` | Active developer sessions (map of userId → session) |
| `data/dev_revoked_keys.json` | List of revoked key strings |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEV_AUTH_SECRET` | Yes | HMAC-SHA256 secret for key signing and verification |
