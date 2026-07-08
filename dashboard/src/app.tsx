import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api, type CheckResponse } from "./api";

// ── types ─────────────────────────────────────────────

interface OverviewData {
  stats: any;
  cmdStats: any;
  msgStats: any;
  aiStats: any;
  eventStats: any;
  topUsers: any;
}

interface CommandsData {
  stats: any;
  monthStats: any;
}

interface MessagesData {
  stats: any;
  monthStats: any;
}

interface AIData {
  stats: any;
  monthStats: any;
}

interface EventsData {
  stats: any;
  monthStats: any;
}

interface DevSessionsData {
  sessions: Array<{
    userId: string;
    username: string;
    loginTime: number;
    permissions: string[];
  }>;
}

// ── helpers ───────────────────────────────────────────

function fmt(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function date(ts: number): string {
  return new Date(ts).toLocaleString();
}

function plural(n: number, s: string): string {
  return `${n} ${s}${n === 1 ? "" : "s"}`;
}

// ── Login ─────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (username: string) => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ ok: boolean; username: string }>("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (data.ok) onLogin(data.username);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CapyBot Dashboard</CardTitle>
          <CardDescription>Enter your dev key to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              placeholder="dev key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ── Overview ──────────────────────────────────────────

function Overview({ data }: { data: OverviewData }) {
  const { stats, cmdStats, msgStats, aiStats, topUsers } = data;

  const totalCommands = stats?.commands?.totalRecords ?? 0;
  const totalMessages = stats?.messages?.totalRecords ?? 0;
  const totalAI = stats?.ai?.totalRecords ?? 0;
  const totalEvents = stats?.events?.totalRecords ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commands" value={plural(totalCommands, "command")} />
        <StatCard label="Messages" value={plural(totalMessages, "message")} />
        <StatCard label="AI Generations" value={plural(totalAI, "generation")} />
        <StatCard label="Events" value={plural(totalEvents, "event")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cmdStats && (
          <Card>
            <CardHeader>
              <CardTitle>Commands (7d)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Total: {cmdStats.totalCommands}</p>
              <p>Success rate: {pct(cmdStats.successRate)}</p>
              <p>Avg execution: {fmt(cmdStats.avgExecutionTime)}</p>
            </CardContent>
          </Card>
        )}
        {msgStats && (
          <Card>
            <CardHeader>
              <CardTitle>Messages (7d)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Total: {msgStats.totalMessages}</p>
              <p>Processed: {msgStats.processed}</p>
              <p>
                Avg response: {msgStats.avgResponseTime ? fmt(msgStats.avgResponseTime) : "N/A"}
              </p>
            </CardContent>
          </Card>
        )}
        {aiStats && (
          <Card>
            <CardHeader>
              <CardTitle>AI (7d)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Total: {aiStats.totalGenerations}</p>
              <p>Success rate: {pct(aiStats.successRate)}</p>
              <p>Total tokens: {aiStats.totalTokens.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {topUsers && topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Users (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Commands</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u: any) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-mono text-xs">{u.userId}</TableCell>
                    <TableCell>{u.messageCount}</TableCell>
                    <TableCell>{u.commandCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── CommandsView ──────────────────────────────────────

function CommandsView({ data }: { data: CommandsData }) {
  const { stats } = data;

  const byCommand = stats?.byCommand as
    | Record<string, { count: number; successRate: number }>
    | undefined;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total (7d)" value={plural(stats.totalCommands, "command")} />
          <StatCard label="Success rate" value={pct(stats.successRate)} />
          <StatCard label="Avg execution" value={fmt(stats.avgExecutionTime)} />
        </div>
      )}
      {byCommand && (
        <Card>
          <CardHeader>
            <CardTitle>By Command</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Command</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byCommand)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([name, info]) => (
                    <TableRow key={name}>
                      <TableCell className="font-mono">/{name}</TableCell>
                      <TableCell>{info.count}</TableCell>
                      <TableCell>
                        <Badge variant={info.successRate > 0.8 ? "default" : "destructive"}>
                          {pct(info.successRate)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── MessagesView ──────────────────────────────────────

function MessagesView({ data }: { data: MessagesData }) {
  const { stats } = data;

  const byReason = stats?.byReason as Record<string, number> | undefined;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total (7d)" value={plural(stats.totalMessages, "message")} />
          <StatCard label="Responses" value={plural(stats.responseGenerated, "response")} />
          <StatCard
            label="Avg response"
            value={stats.avgResponseTime ? fmt(stats.avgResponseTime) : "N/A"}
          />
        </div>
      )}
      {byReason && (
        <Card>
          <CardHeader>
            <CardTitle>By Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byReason)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => (
                    <TableRow key={reason}>
                      <TableCell>{reason}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── AIView ────────────────────────────────────────────

function AIView({ data }: { data: AIData }) {
  const { stats } = data;

  const byModel = stats?.byModel as Record<string, number> | undefined;
  const toolUsage = stats?.toolUsage as
    | Array<{
        toolName: string;
        callCount: number;
        successCount: number;
        errorCount: number;
        lastUsed: number;
      }>
    | undefined;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Generations (7d)" value={plural(stats.totalGenerations, "generation")} />
          <StatCard label="Success rate" value={pct(stats.successRate)} />
          <StatCard label="Total tokens" value={stats.totalTokens.toLocaleString()} />
          <StatCard label="Avg time" value={fmt(stats.avgGenerationTime)} />
        </div>
      )}
      {byModel && (
        <Card>
          <CardHeader>
            <CardTitle>By Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Uses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byModel)
                  .sort(([, a], [, b]) => b - a)
                  .map(([model, count]) => (
                    <TableRow key={model}>
                      <TableCell className="font-mono text-xs">{model}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {toolUsage && toolUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toolUsage.map((tool) => (
                  <TableRow key={tool.toolName}>
                    <TableCell className="font-mono text-xs">{tool.toolName}</TableCell>
                    <TableCell>{tool.callCount}</TableCell>
                    <TableCell>{tool.successCount}</TableCell>
                    <TableCell>
                      {tool.errorCount > 0 ? (
                        <Badge variant="destructive">{tool.errorCount}</Badge>
                      ) : (
                        tool.errorCount
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── EventsView ────────────────────────────────────────

function EventsView({ data }: { data: EventsData }) {
  const { stats } = data;

  const byEvent = stats?.byEvent as Record<string, number> | undefined;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <StatCard label="Total (7d)" value={plural(stats.totalEvents, "event")} />
        </div>
      )}
      {byEvent && (
        <Card>
          <CardHeader>
            <CardTitle>By Event Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byEvent)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="font-mono text-xs">{name}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── DevSessionsView ───────────────────────────────────

function DevSessionsView({ data }: { data: DevSessionsData }) {
  const { sessions } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>Currently stored developer sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active sessions</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Login Time</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.userId}>
                  <TableCell className="font-mono text-xs">{s.userId}</TableCell>
                  <TableCell>{s.username}</TableCell>
                  <TableCell>{date(s.loginTime)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-[10px]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── App ───────────────────────────────────────────────

export function App() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  // per-tab data
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [commands, setCommands] = useState<CommandsData | null>(null);
  const [messages, setMessages] = useState<MessagesData | null>(null);
  const [ai, setAI] = useState<AIData | null>(null);
  const [events, setEvents] = useState<EventsData | null>(null);
  const [sessions, setSessions] = useState<DevSessionsData | null>(null);

  // loading per tab
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async <T,>(key: string, path: string, setter: (d: T) => void) => {
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      const data = await api<T>(path);
      setter(data);
    } catch {
      // ignore
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }, []);

  useEffect(() => {
    api<CheckResponse>("/api/check")
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true);
          setUsername(data.username || "");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    fetchData("overview", "/api/stats", setOverview);
    fetchData("commands", "/api/commands", setCommands);
    fetchData("messages", "/api/messages", setMessages);
    fetchData("ai", "/api/ai", setAI);
    fetchData("events", "/api/events", setEvents);
    fetchData("sessions", "/api/dev-sessions", setSessions);
  }, [authenticated, fetchData]);

  const handleLogin = (u: string) => {
    setAuthenticated(true);
    setUsername(u);
  };

  const handleLogout = async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    setAuthenticated(false);
    setUsername("");
    setOverview(null);
    setCommands(null);
    setMessages(null);
    setAI(null);
    setEvents(null);
    setSessions(null);
  };

  if (checking) return null;

  if (!authenticated) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">CapyBot Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{username}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {loading.overview ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : overview ? (
            <Overview data={overview} />
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </TabsContent>

        <TabsContent value="commands" className="mt-4">
          {loading.commands ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : commands ? (
            <CommandsView data={commands} />
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          {loading.messages ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : messages ? (
            <MessagesView data={messages} />
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {loading.ai ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : ai ? (
            <AIView data={ai} />
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {loading.events ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : events ? (
            <EventsView data={events} />
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          {loading.sessions ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : sessions ? (
            <DevSessionsView data={sessions} />
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
