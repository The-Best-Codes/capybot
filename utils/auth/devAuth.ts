import { createHmac } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const SESSIONS_FILE = join(process.cwd(), "data", "dev_sessions.json");

interface DevSession {
  key: string;
  loginTime: number;
}

interface SessionStore {
  [discordUserId: string]: DevSession;
}

export interface KeyValidationResult {
  valid: boolean;
  error?: "invalid_signature" | "expired" | "wrong_user";
  username?: string;
  expiresAt?: number | null;
  daysRemaining?: number | null;
}

function ensureSessionsFile(): void {
  const dir = dirname(SESSIONS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(SESSIONS_FILE)) {
    writeFileSync(SESSIONS_FILE, "{}", "utf-8");
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

  const payload = JSON.stringify({ u: username, e: expiration });
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url")
    .slice(0, 8);

  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signature}`;
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
    .digest("base64url")
    .slice(0, 8);

  if (providedSignature !== expectedSignature) {
    return { valid: false, error: "invalid_signature" };
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
