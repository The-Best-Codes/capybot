import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CheckResponse } from "./api";

const PERIODS = [
  { value: "1", label: "24h" },
  { value: "3", label: "3d" },
  { value: "7", label: "7d" },
  { value: "14", label: "14d" },
  { value: "30", label: "30d" },
  { value: "all", label: "All" },
] as const;

interface TopUser {
  userId: string;
  messageCount: number;
  commandCount: number;
}

interface OverviewData {
  stats: any;
  cmdStats: any;
  msgStats: any;
  aiStats: any;
  eventStats: any;
  topUsers: TopUser[];
}

interface CommandsData {
  stats: {
    totalCommands: number;
    successRate: number;
    byCommand: Record<string, { count: number; successRate: number }>;
    avgExecutionTime: number;
  } | null;
}

interface MessagesData {
  stats: {
    totalMessages: number;
    processed: number;
    responseGenerated: number;
    byReason: Record<string, number>;
    avgResponseTime: number;
  } | null;
}

interface AIData {
  stats: {
    totalGenerations: number;
    successRate: number;
    avgGenerationTime: number;
    toolUsage: Array<{
      toolName: string;
      callCount: number;
      successCount: number;
      errorCount: number;
      lastUsed: number;
    }>;
    totalTokens: number;
    byModel: Record<string, number>;
  } | null;
}

interface EventsData {
  stats: {
    totalEvents: number;
    byEvent: Record<string, number>;
  } | null;
}

interface DevSessionsData {
  sessions: Array<{
    userId: string;
    username: string;
    loginTime: number;
    permissions: string[];
  }>;
}

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

function UserId({ id }: { id: string }) {
  return (
    <span className="font-mono text-xs text-muted-foreground" title={id}>
      {id.slice(0, 8)}...
    </span>
  );
}

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function LoadingStatCards({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32 mt-1" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function UserDetailDialog({
  user,
  open,
  onOpenChange,
}: {
  user: TopUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Activity summary for this user</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">User ID</div>
            <div className="font-mono text-sm">{user.userId}</div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Messages</CardDescription>
                <CardTitle className="text-xl">{user.messageCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Commands</CardDescription>
                <CardTitle className="text-xl">{user.commandCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Activity</div>
            <div className="text-lg font-semibold">
              {user.messageCount + user.commandCount} interactions
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandDetailDialog({
  name,
  info,
  avgExecutionTime,
  open,
  onOpenChange,
}: {
  name: string;
  info: { count: number; successRate: number } | null;
  avgExecutionTime: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!info) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>/{name}</DialogTitle>
          <DialogDescription>Command usage details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Uses</CardDescription>
                <CardTitle className="text-xl">{info.count}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Success Rate</CardDescription>
                <CardTitle className="text-xl">{pct(info.successRate)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Avg Execution Time</div>
            <div className="text-lg font-semibold">{fmt(avgExecutionTime)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolDetailDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: {
    toolName: string;
    callCount: number;
    successCount: number;
    errorCount: number;
    lastUsed: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!tool) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tool.toolName}</DialogTitle>
          <DialogDescription>Tool usage statistics</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Calls</CardDescription>
                <CardTitle className="text-xl">{tool.callCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Success</CardDescription>
                <CardTitle className="text-xl text-green-600 dark:text-green-400">
                  {tool.successCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Errors</CardDescription>
                <CardTitle className={`text-xl ${tool.errorCount > 0 ? "text-destructive" : ""}`}>
                  {tool.errorCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-lg font-semibold">
              {tool.callCount > 0 ? pct(tool.successCount / tool.callCount) : "N/A"}
            </div>
          </div>
          <Separator />
          <div>
            <div className="text-sm text-muted-foreground">Last Used</div>
            <div className="text-sm">{date(tool.lastUsed)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionDetailDialog({
  session,
  open,
  onOpenChange,
}: {
  session: DevSessionsData["sessions"][number] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!session) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session.username}</DialogTitle>
          <DialogDescription>Developer session details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">User ID</div>
            <div className="font-mono text-sm">{session.userId}</div>
          </div>
          <Separator />
          <div>
            <div className="text-sm text-muted-foreground">Login Time</div>
            <div className="text-sm">{date(session.loginTime)}</div>
          </div>
          <Separator />
          <div>
            <div className="text-sm text-muted-foreground mb-2">Permissions</div>
            <div className="flex flex-wrap gap-1.5">
              {session.permissions.length === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                session.permissions.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Overview({ data }: { data: OverviewData }) {
  const { stats, cmdStats, msgStats, aiStats, topUsers } = data;
  const [selectedUser, setSelectedUser] = useState<TopUser | null>(null);

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
              <CardTitle>Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="tabular-nums font-medium">{cmdStats.totalCommands}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success rate</span>
                <Badge variant={cmdStats.successRate > 0.8 ? "default" : "destructive"}>
                  {pct(cmdStats.successRate)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg execution</span>
                <span className="tabular-nums font-medium">{fmt(cmdStats.avgExecutionTime)}</span>
              </div>
            </CardContent>
          </Card>
        )}
        {msgStats && (
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="tabular-nums font-medium">{msgStats.totalMessages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed</span>
                <span className="tabular-nums font-medium">{msgStats.processed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg response</span>
                <span className="tabular-nums font-medium">
                  {msgStats.avgResponseTime ? fmt(msgStats.avgResponseTime) : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        {aiStats && (
          <Card>
            <CardHeader>
              <CardTitle>AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="tabular-nums font-medium">{aiStats.totalGenerations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success rate</span>
                <Badge variant={aiStats.successRate > 0.8 ? "default" : "destructive"}>
                  {pct(aiStats.successRate)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total tokens</span>
                <span className="tabular-nums font-medium">
                  {aiStats.totalTokens.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {topUsers && topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Commands</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u) => (
                  <TableRow
                    key={u.userId}
                    className="cursor-pointer"
                    onClick={() => setSelectedUser(u)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserId id={u.userId} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{u.messageCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.commandCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <UserDetailDialog
        user={selectedUser!}
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      />
    </div>
  );
}

function CommandsView({ data }: { data: CommandsData }) {
  const { stats } = data;
  const [selected, setSelected] = useState<{
    name: string;
    info: { count: number; successRate: number };
  } | null>(null);

  const byCommand = stats?.byCommand;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={plural(stats.totalCommands, "command")} />
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
                  <TableHead className="text-right">Uses</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byCommand)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([name, info]) => (
                    <TableRow
                      key={name}
                      className="cursor-pointer"
                      onClick={() => setSelected({ name, info })}
                    >
                      <TableCell className="font-medium">/{name}</TableCell>
                      <TableCell className="text-right tabular-nums">{info.count}</TableCell>
                      <TableCell className="text-right">
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

      <CommandDetailDialog
        name={selected?.name ?? ""}
        info={selected?.info ?? { count: 0, successRate: 0 }}
        avgExecutionTime={stats?.avgExecutionTime ?? 0}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

function MessagesView({ data }: { data: MessagesData }) {
  const { stats } = data;
  const byReason = stats?.byReason;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={plural(stats.totalMessages, "message")} />
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
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byReason)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => (
                    <TableRow key={reason}>
                      <TableCell className="capitalize">{reason.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right tabular-nums">{count}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {stats ? pct(count / stats.totalMessages) : ""}
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

function AIView({ data }: { data: AIData }) {
  const { stats } = data;
  const [selectedTool, setSelectedTool] = useState<{
    toolName: string;
    callCount: number;
    successCount: number;
    errorCount: number;
    lastUsed: number;
  } | null>(null);

  const byModel = stats?.byModel;
  const toolUsage = stats?.toolUsage;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Generations" value={plural(stats.totalGenerations, "generation")} />
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
                  <TableHead className="text-right">Uses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byModel)
                  .sort(([, a], [, b]) => b - a)
                  .map(([model, count]) => (
                    <TableRow key={model}>
                      <TableCell className="text-sm">{model}</TableCell>
                      <TableCell className="text-right tabular-nums">{count}</TableCell>
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
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toolUsage.map((tool) => (
                  <TableRow
                    key={tool.toolName}
                    className="cursor-pointer"
                    onClick={() => setSelectedTool(tool)}
                  >
                    <TableCell className="text-sm">{tool.toolName}</TableCell>
                    <TableCell className="text-right tabular-nums">{tool.callCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">
                      {tool.successCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {tool.errorCount > 0 ? (
                        <Badge variant="destructive">{tool.errorCount}</Badge>
                      ) : (
                        <span className="tabular-nums">{tool.errorCount}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ToolDetailDialog
        tool={selectedTool!}
        open={selectedTool !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTool(null);
        }}
      />
    </div>
  );
}

function EventsView({ data }: { data: EventsData }) {
  const { stats } = data;
  const byEvent = stats?.byEvent;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total" value={plural(stats.totalEvents, "event")} />
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
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byEvent)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="text-sm">{name}</TableCell>
                      <TableCell className="text-right tabular-nums">{count}</TableCell>
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

function DevSessionsView({ data }: { data: DevSessionsData }) {
  const { sessions } = data;
  const [selectedSession, setSelectedSession] = useState<
    DevSessionsData["sessions"][number] | null
  >(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Currently stored developer sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow
                    key={s.userId}
                    className="cursor-pointer"
                    onClick={() => setSelectedSession(s)}
                  >
                    <TableCell className="font-medium">{s.username}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {date(s.loginTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.permissions.slice(0, 2).map((p) => (
                          <Badge key={p} variant="secondary">
                            {p}
                          </Badge>
                        ))}
                        {s.permissions.length > 2 && (
                          <Badge variant="outline">+{s.permissions.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SessionDetailDialog
        session={selectedSession!}
        open={selectedSession !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
      />
    </>
  );
}

export function App() {
  const [period, setPeriod] = useState("7");
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [commands, setCommands] = useState<CommandsData | null>(null);
  const [messages, setMessages] = useState<MessagesData | null>(null);
  const [ai, setAI] = useState<AIData | null>(null);
  const [events, setEvents] = useState<EventsData | null>(null);
  const [sessions, setSessions] = useState<DevSessionsData | null>(null);

  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(
    async <T,>(key: string, path: string, setter: (d: T) => void) => {
      setLoading((l) => ({ ...l, [key]: true }));
      try {
        const url = period !== "all" ? `${path}?days=${period}` : path;
        const data = await api<T>(url);
        setter(data);
      } catch {
        // ignore
      } finally {
        setLoading((l) => ({ ...l, [key]: false }));
      }
    },
    [period],
  );

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
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold">CapyBot Dashboard</h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{username}</span>
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
            <div className="flex flex-col gap-6">
              <LoadingStatCards count={4} />
              <LoadingTable rows={5} />
            </div>
          ) : overview ? (
            <Overview data={overview} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </TabsContent>

        <TabsContent value="commands" className="mt-4">
          {loading.commands ? (
            <div className="flex flex-col gap-6">
              <LoadingStatCards count={3} />
              <LoadingTable rows={5} />
            </div>
          ) : commands ? (
            <CommandsView data={commands} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          {loading.messages ? (
            <div className="flex flex-col gap-6">
              <LoadingStatCards count={3} />
              <LoadingTable rows={4} />
            </div>
          ) : messages ? (
            <MessagesView data={messages} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {loading.ai ? (
            <div className="flex flex-col gap-6">
              <LoadingStatCards count={4} />
              <LoadingTable rows={4} />
            </div>
          ) : ai ? (
            <AIView data={ai} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {loading.events ? (
            <div className="flex flex-col gap-6">
              <LoadingStatCards count={1} />
              <LoadingTable rows={4} />
            </div>
          ) : events ? (
            <EventsView data={events} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          {loading.sessions ? (
            <LoadingTable rows={3} />
          ) : sessions ? (
            <DevSessionsView data={sessions} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
