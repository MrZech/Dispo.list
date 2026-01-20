import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import LayoutShell from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, Database, Plus, Trash2, KeyRound, Shield, ShieldAlert, Play, AlertCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SafeUser } from "@shared/models/auth";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <LayoutShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users and database</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2" data-testid="tab-database">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseManagement />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityFeed />
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}

function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: users = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateDialog(false);
      toast({ title: "User created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete user", description: err.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiRequest("POST", `/api/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      setShowResetPasswordDialog(null);
      setNewPassword("");
      toast({ title: "Password reset successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to reset password", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUserMutation.mutate({
      username: formData.get("username"),
      password: formData.get("password"),
      firstName: formData.get("firstName") || undefined,
      lastName: formData.get("lastName") || undefined,
      email: formData.get("email") || undefined,
      role: formData.get("role") || "user",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user account to the system.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input id="username" name="username" required data-testid="input-new-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" name="password" type="password" required minLength={6} data-testid="input-new-password" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="user">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-user">
                  {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                    : "-"}
                </TableCell>
                <TableCell>{user.email || "-"}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" && <ShieldAlert className="w-3 h-3 mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.isActive}
                    onCheckedChange={(checked) =>
                      toggleUserMutation.mutate({ id: user.id, isActive: checked })
                    }
                    data-testid={`switch-active-${user.id}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowResetPasswordDialog(user.id)}
                      data-testid={`button-reset-password-${user.id}`}
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this user?")) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!showResetPasswordDialog} onOpenChange={() => setShowResetPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for the user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                data-testid="input-reset-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (showResetPasswordDialog && newPassword.length >= 6) {
                  resetPasswordMutation.mutate({ id: showResetPasswordDialog, newPassword });
                }
              }}
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DatabaseManagement() {
  const { toast } = useToast();
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/database/stats"],
  });

  const runQueryMutation = useMutation({
    mutationFn: (query: string) => apiRequest("POST", "/api/admin/database/query", { query }),
    onSuccess: (data: any) => {
      setQueryResult(data);
      setQueryError(null);
    },
    onError: (err: any) => {
      setQueryError(err.message);
      setQueryResult(null);
    },
  });

  const handleRunQuery = () => {
    if (!sqlQuery.trim()) return;
    runQueryMutation.mutate(sqlQuery);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Statistics</CardTitle>
          <CardDescription>Overview of table row counts</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats || {}).map(([table, count]) => (
                <div key={table} className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{table}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SQL Query Tool</CardTitle>
          <CardDescription>
            Run read-only SELECT queries against the database. Only SELECT statements are allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sql">SQL Query</Label>
            <Textarea
              id="sql"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="SELECT * FROM items LIMIT 10"
              className="font-mono min-h-[100px]"
              data-testid="input-sql-query"
            />
          </div>

          <Button
            onClick={handleRunQuery}
            disabled={runQueryMutation.isPending || !sqlQuery.trim()}
            data-testid="button-run-query"
          >
            {runQueryMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Query
          </Button>

          {queryError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{queryError}</span>
            </div>
          )}

          {queryResult && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {queryResult.rowCount} row(s) returned
              </div>
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                {queryResult.rows.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(queryResult.rows[0]).map((col) => (
                          <TableHead key={col} className="whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryResult.rows.map((row: any, i: number) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <TableCell key={j} className="font-mono text-xs whitespace-nowrap">
                              {val === null ? (
                                <span className="text-muted-foreground">NULL</span>
                              ) : typeof val === "object" ? (
                                JSON.stringify(val)
                              ) : (
                                String(val)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  actorId: string | null;
  actorUsername: string | null;
};

function ActivityFeed() {
  const { data: logs = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["/api/admin/audit", 50],
    queryFn: async () => {
      const url = new URL("/api/admin/audit", window.location.origin);
      url.searchParams.set("limit", "50");
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
  });

  const formatAction = (action: string) =>
    action
      .split(".")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Last 50 actions across the system.</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-sm">No activity yet.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {formatAction(entry.action)}{" "}
                    <span className="text-muted-foreground">
                      {entry.entityType}
                      {entry.entityId ? ` #${entry.entityId}` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.actorUsername || entry.actorId || "System"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
