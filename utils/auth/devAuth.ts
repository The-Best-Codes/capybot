import { createHmac, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const SESSIONS_FILE = join(DATA_DIR, "dev_sessions.json");
const REVOKED_KEYS_FILE = join(DATA_DIR, "dev_revoked_keys.json");

interface DevSession {
  key: string;
  loginTime: number;
}

interface SessionStore {
  [discordUserId: string]: DevSession;
}

interface RevokedKeysStore {
  keys: string[];
}

export interface KeyValidationResult {
  valid: boolean;
  error?: "invalid_signature" | "expired" | "wrong_user" | "revoked";
  username?: string;
  expiresAt?: number | null;
  daysRemaining?: number | null;
}

export interface KeyInfo {
  valid: boolean;
  username?: string;
  expiresAt?: number | null;
  neverExpires?: boolean;
  expired?: boolean;
  revoked?: boolean;
  error?: string;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureSessionsFile(): void {
  ensureDataDir();
  try {
    writeFileSync(SESSIONS_FILE, "{}", { encoding: "utf-8", flag: "wx" });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }
}

function ensureRevokedKeysFile(): void {
  ensureDataDir();
  try {
    writeFileSync(REVOKED_KEYS_FILE, '{"keys":[]}', {
      encoding: "utf-8",
      flag: "wx",
    });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }
}

function loadSessions(): SessionStore {
  ensureSessionsFile();
  try {
    return JSON.parse(readFileSync(SESSIONS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveSessions(sessions: SessionStore): void {
  ensureSessionsFile();
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

function loadRevokedKeys(): RevokedKeysStore {
  ensureRevokedKeysFile();
  try {
    return JSON.parse(readFileSync(REVOKED_KEYS_FILE, "utf-8"));
  } catch {
    return { keys: [] };
  }
}

function saveRevokedKeys(store: RevokedKeysStore): void {
  ensureRevokedKeysFile();
  writeFileSync(REVOKED_KEYS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function isKeyRevoked(key: string): boolean {
  const store = loadRevokedKeys();
  return store.keys.includes(key);
}

export function revokeKey(key: string): boolean {
  const store = loadRevokedKeys();
  if (store.keys.includes(key)) {
    return false;
  }
  store.keys.push(key);
  saveRevokedKeys(store);

  const sessions = loadSessions();
  for (const userId of Object.keys(sessions)) {
    if (sessions[userId].key === key) {
      delete sessions[userId];
    }
  }
  saveSessions(sessions);

  return true;
}

export function revokeUserSessions(username: string): number {
  const sessions = loadSessions();
  const normalizedUsername = username.toLowerCase().replace(/^@/, "");
  let count = 0;

  for (const userId of Object.keys(sessions)) {
    const keyInfo = getKeyInfo(sessions[userId].key);
    if (
      keyInfo.username &&
      keyInfo.username.toLowerCase().replace(/^@/, "") === normalizedUsername
    ) {
      revokeKey(sessions[userId].key);
      count++;
    }
  }

  return count;
}

export function generateDevKey(
  username: string,
  expirationDays?: number,
): string {
  const secret = process.env.DEV_AUTH_SECRET;
  if (!secret) {
    throw new Error("DEV_AUTH_SECRET is not set");
  }

  const expiration =
    expirationDays !== undefined
      ? Date.now() + expirationDays * 24 * 60 * 60 * 1000
      : 0;

  const nonce = randomBytes(8).toString("base64url");

  const payload = JSON.stringify({ u: username, e: expiration, n: nonce });
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signature}`;
}

export function getKeyInfo(key: string): KeyInfo {
  const secret = process.env.DEV_AUTH_SECRET;
  if (!secret) {
    return { valid: false, error: "DEV_AUTH_SECRET is not set" };
  }

  const parts = key.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid key format" };
  }

  const [encoded, providedSignature] = parts;

  let payload: string;
  let parsed: { u: string; e: number };
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf-8");
    parsed = JSON.parse(payload);
  } catch {
    return { valid: false, error: "Invalid key encoding" };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (providedSignature !== expectedSignature) {
    return { valid: false, error: "Invalid signature" };
  }

  if (isKeyRevoked(key)) {
    return {
      valid: false,
      revoked: true,
      username: parsed.u,
      expiresAt: parsed.e === 0 ? null : parsed.e,
      error: "Key has been revoked",
    };
  }

  const neverExpires = parsed.e === 0;
  const expired = !neverExpires && Date.now() > parsed.e;

  return {
    valid: !expired,
    username: parsed.u,
    expiresAt: neverExpires ? null : parsed.e,
    neverExpires,
    expired,
    revoked: false,
  };
}

export function validateDevKey(
  key: string,
  discordUsername: string,
): KeyValidationResult {
  const secret = process.env.DEV_AUTH_SECRET;
  if (!secret) {
    return { valid: false, error: "invalid_signature" };
  }

  const parts = key.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "invalid_signature" };
  }

  const [encoded, providedSignature] = parts;

  let payload: string;
  let parsed: { u: string; e: number };
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf-8");
    parsed = JSON.parse(payload);
  } catch {
    return { valid: false, error: "invalid_signature" };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (providedSignature !== expectedSignature) {
    return { valid: false, error: "invalid_signature" };
  }

  if (isKeyRevoked(key)) {
    return { valid: false, error: "revoked", username: parsed.u };
  }

  const username = parsed.u;
  const expiration = parsed.e;

  const normalizedKeyUsername = username.toLowerCase().replace(/^@/, "");
  const normalizedDiscordUsername = discordUsername
    .toLowerCase()
    .replace(/^@/, "");

  if (normalizedKeyUsername !== normalizedDiscordUsername) {
    return { valid: false, error: "wrong_user", username };
  }

  if (expiration !== 0) {
    if (Date.now() > expiration) {
      return { valid: false, error: "expired" };
    }

    const daysRemaining = Math.ceil(
      (expiration - Date.now()) / (24 * 60 * 60 * 1000),
    );
    return {
      valid: true,
      username,
      expiresAt: expiration,
      daysRemaining,
    };
  }

  return {
    valid: true,
    username,
    expiresAt: null,
    daysRemaining: null,
  };
}

export function saveSession(discordUserId: string, key: string): void {
  const sessions = loadSessions();
  sessions[discordUserId] = {
    key,
    loginTime: Date.now(),
  };
  saveSessions(sessions);
}

export function getSession(discordUserId: string): DevSession | null {
  const sessions = loadSessions();
  return sessions[discordUserId] || null;
}

export function clearSession(discordUserId: string): void {
  const sessions = loadSessions();
  delete sessions[discordUserId];
  saveSessions(sessions);
}

export function checkDevAuth(
  discordUserId: string,
  discordUsername: string,
): KeyValidationResult & { loggedIn: boolean } {
  const session = getSession(discordUserId);

  if (!session) {
    return { valid: false, loggedIn: false };
  }

  const result = validateDevKey(session.key, discordUsername);

  if (!result.valid) {
    clearSession(discordUserId);
  }

  return { ...result, loggedIn: result.valid };
}
