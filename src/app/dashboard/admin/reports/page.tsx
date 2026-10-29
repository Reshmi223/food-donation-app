"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Flag, Eye, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatDateTime } from "@/lib/api-client";

type Report = {
  id: string; category: string; description: string; status: string; resolution: string | null;
  createdAt: string; updatedAt: string;
  reporter?: { displayName: string; organizationName: string | null; email: string } | null;
  listing?: { id: string; title: string; status: string; district: string } | null;
};

function catLabel(c: string) {
  return c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ");
}

export default function AdminReportsPage() {
  const { data, isLoading, mutate } = useSWR<{ reports: Report[] }>("/api/admin/reports");
  const [act, setAct] = useState<{ r: Report; status: "REVIEWING" | "RESOLVED" | "DISMISSED" } | null>(null);
  const [resolution, setResolution] = useState("");
  const [removeListing, setRemoveListing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!act) return;
    if (resolution.trim().length < 5) return toast.error("Resolution details are required.");
    setBusy(true);
    try {
      await api("/api/admin/reports", {
        method: "PATCH",
        json: { id: act.r.id, status: act.status, resolution, removeListing },
      });
      toast.success(`Report marked ${act.status.toLowerCase()}.`);
      setAct(null);
      setResolution("");
      setRemoveListing(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const reports = data?.reports ?? [];
  const open = reports.filter((r) => r.status === "OPEN" || r.status === "REVIEWING");
  const closed = reports.filter((r) => r.status === "RESOLVED" || r.status === "DISMISSED");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const ReportCard = ({ r }: { r: Report }) => (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-medium">
            <ShieldAlert className={`h-4 w-4 ${r.status === "OPEN" ? "text-destructive" : "text-primary"}`} aria-hidden />
            {catLabel(r.category)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.reporter ? `${r.reporter.organizationName ?? r.reporter.displayName} (${r.reporter.email})` : "Anonymous"} · {formatDateTime(r.createdAt)}
          </p>
        </div>
        <Badge variant={r.status === "OPEN" ? "outline" : "secondary"} className={r.status === "OPEN" ? "border-destructive/40 text-destructive" : ""}>
          {r.status.toLowerCase()}
        </Badge>
      </div>
      <p className="mt-2.5 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{r.description}</p>
      {r.listing && (
        <p className="mt-2 text-xs text-muted-foreground">
          Listing: <a href={`/explore/${r.listing.id}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{r.listing.title}</a> ({r.listing.status.toLowerCase()}, {r.listing.district})
        </p>
      )}
      {r.resolution && <p className="mt-2 text-xs text-muted-foreground">Resolution: {r.resolution}</p>}
      {(r.status === "OPEN" || r.status === "REVIEWING") && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setAct({ r, status: "REVIEWING" }); setResolution(""); setRemoveListing(false); }}>
            <Eye className="h-3.5 w-3.5" aria-hidden /> Mark reviewing
          </Button>
          <Button size="sm" onClick={() => { setAct({ r, status: "RESOLVED" }); setResolution(""); setRemoveListing(false); }}>
            Resolve
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setAct({ r, status: "DISMISSED" }); setResolution(""); setRemoveListing(false); }}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Safety reports</h1>
        <p className="text-sm text-muted-foreground">Reported listings and claims. Reporting instantly flags a listing; you decide the outcome.</p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4 space-y-4">
          {open.length === 0 ? (
            <EmptyState icon={Flag} title="No open reports" description="Safety reports from users appear here for review." />
          ) : (
            open.map((r) => <ReportCard key={r.id} r={r} />)
          )}
        </TabsContent>
        <TabsContent value="closed" className="mt-4 space-y-4">
          {closed.length === 0 ? (
            <EmptyState icon={Flag} title="No closed reports" description="Resolved and dismissed reports appear here." />
          ) : (
            closed.map((r) => <ReportCard key={r.id} r={r} />)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!act} onOpenChange={(o) => !o && setAct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update report — {act?.r && catLabel(act.r.category)}</DialogTitle>
            <DialogDescription>Record your findings. Reporters are notified of the outcome.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="res">Resolution details (required)</Label>
              <Textarea id="res" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </div>
            {act?.r.listing && (
              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox checked={removeListing} onCheckedChange={(v) => setRemoveListing(Boolean(v))} className="mt-0.5" />
                <span className="text-muted-foreground">
                  Also remove the reported listing &ldquo;{act.r.listing.title}&rdquo; (open claims cancelled, NGOs notified).
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAct(null)}>Cancel</Button>
            <Button disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
