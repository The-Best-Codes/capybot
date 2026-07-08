import { config } from "dotenv";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import { serve } from "bun";

const ROOT = path.resolve(import.meta.dirname, "../..");
process.chdir(ROOT);
config({ path: path.join(ROOT, ".env") });

const isProd = process.env.NODE_ENV === "production";
const distPath = path.join(ROOT, "dashboard", "dist");
const WEB_ROOT = existsSync(distPath) ? distPath : path.join(ROOT, "dashboard", "src");

const SESSION_COOKIE = "dash_session";

interface DashSession {
  key: string;
  username: string;
  permissions: string[];
}

const dashSessions = new Map<string, DashSession>();

const analyticsModule = import("../../utils/analytics/index");
const queriesModule = import("../../utils/analytics/queries");
const devAuthModule = import("../../utils/auth/devAuth");
const permissionsModule = import("../../utils/auth/permissions");

function parseDaysParam(url: URL): number | null {
  const days = url.searchParams.get("days");
  if (!days || days === "all") return null;
  const n = parseInt(days, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function getStartDate(days: number | null): Promise<string> {
  const { AnalyticsQueries } = await queriesModule;
  if (days !== null) return AnalyticsQueries.getDaysAgo(days);

  const { analytics } = await analyticsModule;
  const stats = await analytics.getStats();
  const dates = [stats.commands, stats.events, stats.messages, stats.ai]
    .filter(Boolean)
    .map((s) => s?.dateRange?.start)
    .filter(Boolean) as string[];
  if (dates.length === 0) return AnalyticsQueries.getDaysAgo(7);
  return dates.sort()[0]!;
}

function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

async function getAnalyticsOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getSessionFromCookie(req: Request): Promise<DashSession | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.split(";").find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const sid = match.split("=")[1]?.trim();
  if (!sid) return null;
  const session = dashSessions.get(sid) || null;
  if (!session) return null;

  const { getKeyInfo } = await devAuthModule;
  const info = getKeyInfo(session.key);
  if (!info.valid) {
    dashSessions.delete(sid);
    return null;
  }

  return session;
}

function serveFile(filePath: string, mime: string): Response | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    return new Response(content, {
      status: 200,
      headers: { "Content-Type": mime },
    });
  } catch {
    return null;
  }
}

async function tryServeStatic(url: URL): Promise<Response | null> {
  const reqPath = url.pathname;
  if (reqPath === "/") return null;

  const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(WEB_ROOT, safePath);

  if (!filePath.startsWith(WEB_ROOT)) return null;
  if (!existsSync(filePath)) return null;

  const ext = path.extname(filePath);
  const mimeMap: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".ts": "application/javascript",
    ".tsx": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
  };
  const mime = mimeMap[ext] || "application/octet-stream";

  return serveFile(filePath, mime);
}

// ── request handlers ─────────────────────────────────

async function handleLogin(req: Request): Promise<Response> {
  const { getKeyInfo } = await devAuthModule;
  const { hasPermission } = await permissionsModule;

  let body: { key: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const key = body.key;
  if (!key) return json({ error: "Key is required" }, 400);

  const info = getKeyInfo(key);
  if (!info.valid) return json({ error: info.error || "Invalid key" }, 401);

  const permissions = info.permissions || [];
  if (!hasPermission(permissions, "view_dashboard")) {
    return json({ error: "Key does not have view_dashboard permission" }, 403);
  }

  const sid = generateSessionId();
  dashSessions.set(sid, { key, username: info.username || "unknown", permissions });

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );

  return new Response(JSON.stringify({ ok: true, username: info.username }), {
    status: 200,
    headers,
  });
}

function handleLogout(req: Request): Response {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.split(";").find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
  if (match) {
    const sid = match.split("=")[1]?.trim();
    if (sid) dashSessions.delete(sid);
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

async function handleCheck(req: Request): Promise<Response> {
  const session = await getSessionFromCookie(req);
  if (!session) return json({ authenticated: false }, 401);
  return json({
    authenticated: true,
    username: session.username,
    permissions: session.permissions,
  });
}

async function ensureAnalytics() {
  const { analytics } = await analyticsModule;
  try {
    await analytics.initialize();
  } catch {}
}

async function handleStats(url: URL): Promise<Response> {
  const { analytics } = await analyticsModule;
  const { AnalyticsQueries } = await queriesModule;
  await ensureAnalytics();
  const today = AnalyticsQueries.getToday();
  const days = parseDaysParam(url);
  const start = await getStartDate(days);

  const [stats, cmdStats, msgStats, aiStats, eventStats, topUsers] = await Promise.all([
    analytics.getStats(),
    getAnalyticsOrNull(() => AnalyticsQueries.getCommandStats(start, today)),
    getAnalyticsOrNull(() => AnalyticsQueries.getMessageStats(start, today)),
    getAnalyticsOrNull(() => AnalyticsQueries.getAIStats(start, today)),
    getAnalyticsOrNull(() => AnalyticsQueries.getEventStats(start, today)),
    getAnalyticsOrNull(() => AnalyticsQueries.getTopUsers(start, today, 5)),
  ]);

  return json({ stats, cmdStats, msgStats, aiStats, eventStats, topUsers });
}

async function handleCommands(url: URL): Promise<Response> {
  const { AnalyticsQueries } = await queriesModule;
  await ensureAnalytics();
  const today = AnalyticsQueries.getToday();
  const days = parseDaysParam(url);
  const start = await getStartDate(days);

  const stats = await getAnalyticsOrNull(() => AnalyticsQueries.getCommandStats(start, today));

  return json({ stats });
}

async function handleMessages(url: URL): Promise<Response> {
  const { AnalyticsQueries } = await queriesModule;
  await ensureAnalytics();
  const today = AnalyticsQueries.getToday();
  const days = parseDaysParam(url);
  const start = await getStartDate(days);

  const stats = await getAnalyticsOrNull(() => AnalyticsQueries.getMessageStats(start, today));

  return json({ stats });
}

async function handleAI(url: URL): Promise<Response> {
  const { AnalyticsQueries } = await queriesModule;
  await ensureAnalytics();
  const today = AnalyticsQueries.getToday();
  const days = parseDaysParam(url);
  const start = await getStartDate(days);

  const stats = await getAnalyticsOrNull(() => AnalyticsQueries.getAIStats(start, today));

  return json({ stats });
}

async function handleEvents(url: URL): Promise<Response> {
  const { AnalyticsQueries } = await queriesModule;
  await ensureAnalytics();
  const today = AnalyticsQueries.getToday();
  const days = parseDaysParam(url);
  const start = await getStartDate(days);

  const stats = await getAnalyticsOrNull(() => AnalyticsQueries.getEventStats(start, today));

  return json({ stats });
}

async function handleDevSessions(): Promise<Response> {
  const { loadSessions, getKeyInfo } = await devAuthModule;
  const sessions = loadSessions();
  const keys = Object.entries(sessions).map(([userId, session]) => {
    const info = getKeyInfo(session.key);
    return {
      userId,
      username: info.username,
      loginTime: session.loginTime,
      permissions: info.permissions,
    };
  });
  return json({ sessions: keys });
}

// ── server ────────────────────────────────────────────

const server = serve({
  port: parseInt(process.env.DASHBOARD_PORT || "3000", 10),

  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    if (url.pathname === "/api/login" && method === "POST") return handleLogin(req);
    if (url.pathname === "/api/logout" && method === "POST") return handleLogout(req);
    if (url.pathname === "/api/check" && method === "GET") return await handleCheck(req);

    const session = await getSessionFromCookie(req);
    if (!session) {
      if (url.pathname.startsWith("/api/")) return json({ error: "Unauthorized" }, 401);
      const staticFile = await tryServeStatic(url);
      if (staticFile) return staticFile;
      const loginHtml = serveFile(path.join(WEB_ROOT, "index.html"), "text/html");
      return loginHtml || new Response("Not Found", { status: 404 });
    }

    if (url.pathname === "/api/stats") return handleStats(url);
    if (url.pathname === "/api/commands") return handleCommands(url);
    if (url.pathname === "/api/messages") return handleMessages(url);
    if (url.pathname === "/api/ai") return handleAI(url);
    if (url.pathname === "/api/events") return handleEvents(url);
    if (url.pathname === "/api/dev-sessions") return handleDevSessions();

    const staticFile = await tryServeStatic(url);
    if (staticFile) return staticFile;

    const appHtml = serveFile(path.join(WEB_ROOT, "index.html"), "text/html");
    return appHtml || new Response("Not Found", { status: 404 });
  },

  development: !isProd && {
    hmr: true,
    console: true,
  },
});

console.log(`Dashboard running at ${server.url}`);
