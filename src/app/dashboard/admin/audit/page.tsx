"use client";

import { useState } from "react";
import useSWR from "swr";
import { Download, ScrollText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/api-client";
import { toast } from "sonner";

type AuditLog = {
  id: string; action: string; targetType: string | null; targetId: string | null;
  reason: string | null; createdAt: string;
  actor?: { displayName: string; email: string; role: string } | null;
};

export default function AdminAuditPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR<{ logs: AuditLog[]; total: number; pages: number }>(
    `/api/admin/audit?page=${page}${q ? `&action=${encodeURIComponent(q)}` : ""}`
  );

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">Security-relevant events — actor, action, target, reason and timestamp. Read-only.</p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => { window.location.href = "/api/analytics/export?type=audit"; toast.success("Audit CSV downloading."); }}>
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Filter by action (e.g. VERIFICATION, SUSPEND)…" className="pl-9" aria-label="Filter audit log" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit events match" description="Events are recorded for privileged operations, moderation and security-relevant changes." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3"><Badge variant="outline" className="bg-muted/60 font-mono text-[11px]">{l.action}</Badge></td>
                    <td className="px-4 py-3 text-xs">{l.actor ? <span><span className="font-medium">{l.actor.displayName}</span><span className="block text-muted-foreground">{l.actor.email}</span></span> : <span className="text-muted-foreground">system</span>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.targetType ?? "—"}{l.targetId ? ` · ${l.targetId.slice(-8)}` : ""}</td>
                    <td className="max-w-48 truncate px-4 py-3 text-xs text-muted-foreground">{l.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.pages ?? 1) > 1 && (
            <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data?.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
