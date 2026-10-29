"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Search, Ban, RotateCcw, BadgeCheck, ShieldAlert, UserCog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VerificationBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, formatDate } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/constants";

type AdminUser = {
  id: string; email: string; role: string; displayName: string; organizationName: string | null;
  organizationType: string | null; phone: string | null; district: string | null;
  verificationStatus: string; emailVerified: boolean; suspendedReason: string | null; createdAt: string;
  _count: { listings: number; claims: number; assignments: number };
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const { data, isLoading, mutate } = useSWR<{ users: AdminUser[] }>(
    `/api/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role !== "all" ? { role } : {}), ...(status !== "all" ? { status } : {}) })}`
  );
  const [suspend, setSuspend] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(id: string, action: string, reasonText?: string) {
    setBusy(true);
    try {
      await api("/api/admin/users", { method: "PATCH", json: { id, action, reason: reasonText } });
      toast.success(`Action applied: ${action.toLowerCase().replace("_", " ")}`);
      setSuspend(null);
      setReason("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Review accounts, verify donors, suspend abuse. Admin accounts are protected from modification.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or organization…" className="pl-9" aria-label="Search users" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Role filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {["DONOR", "NGO", "VOLUNTEER", "ADMIN"].map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Status filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"].map((s) => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserCog} title="No users match" description="Adjust the search or filters." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.organizationName ?? u.displayName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}{u.district ? ` · ${u.district}` : ""}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className="bg-muted/60">{ROLE_LABELS[u.role] ?? u.role}</Badge></td>
                  <td className="px-4 py-3">
                    <VerificationBadge status={u.verificationStatus} />
                    {u.suspendedReason && <p className="mt-1 max-w-40 truncate text-[11px] text-destructive">{u.suspendedReason}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u._count.listings} listings · {u._count.claims} claims · {u._count.assignments} deliveries
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {u.role !== "ADMIN" && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {u.verificationStatus !== "VERIFIED" && u.verificationStatus !== "SUSPENDED" && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => act(u.id, "VERIFY")}>
                            <BadgeCheck className="h-3 w-3" aria-hidden /> Verify
                          </Button>
                        )}
                        {u.verificationStatus === "SUSPENDED" ? (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => act(u.id, "ACTIVATE")}>
                            <RotateCcw className="h-3 w-3" aria-hidden /> Restore
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive" onClick={() => { setSuspend(u); setReason(""); }}>
                            <Ban className="h-3 w-3" aria-hidden /> Suspend
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!suspend} onOpenChange={(o) => !o && setSuspend(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden /> Suspend {suspend?.organizationName ?? suspend?.displayName}
            </DialogTitle>
            <DialogDescription>
              The user cannot sign in while suspended. This action is recorded in the audit log with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="s-reason">Reason (required)</Label>
            <Textarea id="s-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspend(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy || reason.trim().length < 5} onClick={() => suspend && act(suspend.id, "SUSPEND", reason)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Suspend account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
