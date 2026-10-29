"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { FileCheck2, Check, X, Loader2, FileText, Globe, Phone, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { VerificationBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatDate } from "@/lib/api-client";

type Verification = {
  id: string;
  registrationNo: string;
  website: string | null;
  documentIds: string | null;
  reviewStatus: string;
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  organization: {
    id: string; email: string; displayName: string; organizationName: string;
    organizationType: string | null; phone: string | null; district: string | null;
    locality: string | null; verificationStatus: string; createdAt: string;
  };
  reviewer?: { displayName: string } | null;
};

export default function AdminVerificationsPage() {
  const { data, isLoading, mutate } = useSWR<{ verifications: Verification[] }>("/api/admin/verifications");
  const [decision, setDecision] = useState<{ v: Verification; type: "APPROVED" | "REJECTED" } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!decision) return;
    if (decision.type === "REJECTED" && notes.trim().length < 5) {
      toast.error("Provide review notes when rejecting.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/verifications", {
        method: "PATCH",
        json: { id: decision.v.id, decision: decision.type, reviewNotes: notes || undefined },
      });
      toast.success(`Verification ${decision.type.toLowerCase()}.`);
      setDecision(null);
      setNotes("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const verifications = data?.verifications ?? [];
  const pending = verifications.filter((v) => v.reviewStatus === "PENDING");
  const reviewed = verifications.filter((v) => v.reviewStatus !== "PENDING");

  const Card_ = ({ v }: { v: Verification }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{v.organization.organizationName}</CardTitle>
            <CardDescription className="mt-1">
              {v.organization.displayName} · {v.organization.email}
              {v.organization.district ? ` · ${v.organization.district}` : ""}
            </CardDescription>
          </div>
          <VerificationBadge status={v.reviewStatus === "APPROVED" ? "VERIFIED" : v.reviewStatus === "REJECTED" ? "REJECTED" : "PENDING"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p><span className="font-medium text-foreground">Registration:</span> {v.registrationNo}</p>
          {v.website && (
            <p className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" aria-hidden />
              <a href={v.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{v.website}</a>
            </p>
          )}
          {v.organization.phone && <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden /> {v.organization.phone}</p>}
          <p className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> Submitted {formatDate(v.submittedAt)}</p>
        </div>

        {v.documentIds && JSON.parse(v.documentIds).length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium">Documents (private)</p>
            <div className="flex flex-wrap gap-1.5">
              {JSON.parse(v.documentIds).map((id: string) => (
                <a key={id} href={`/api/uploads/${id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-primary hover:bg-muted">
                  <FileText className="h-3.5 w-3.5" aria-hidden /> View document
                </a>
              ))}
            </div>
          </div>
        )}

        {v.reviewNotes && <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">Review notes: {v.reviewNotes}</p>}

        {v.reviewStatus === "PENDING" ? (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="gap-1" onClick={() => { setDecision({ v, type: "APPROVED" }); setNotes(""); }}>
              <Check className="h-3.5 w-3.5" aria-hidden /> Approve
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setDecision({ v, type: "REJECTED" }); setNotes(""); }}>
              <X className="h-3.5 w-3.5" aria-hidden /> Reject
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Reviewed {v.reviewedAt ? formatDate(v.reviewedAt) : "—"}{v.reviewer ? ` by ${v.reviewer.displayName}` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">NGO verifications</h1>
        <p className="text-sm text-muted-foreground">Review organization documents. Every decision is audited with your notes.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-4">
          {pending.length === 0 ? (
            <EmptyState icon={FileCheck2} title="Queue is clear" description="New verification requests will appear here." />
          ) : (
            pending.map((v) => <Card_ key={v.id} v={v} />)
          )}
        </TabsContent>
        <TabsContent value="reviewed" className="mt-4 space-y-4">
          {reviewed.length === 0 ? (
            <EmptyState icon={FileCheck2} title="No reviewed requests yet" description="Approved and rejected verifications appear here." />
          ) : (
            reviewed.map((v) => <Card_ key={v.id} v={v} />)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.type === "APPROVED" ? "Approve" : "Reject"} verification — {decision?.v.organization.organizationName}
            </DialogTitle>
            <DialogDescription>
              {decision?.type === "APPROVED"
                ? "The organization becomes verified and can immediately claim food."
                : "The organization will be notified with your notes and can resubmit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="review-notes">Review notes {decision?.type === "REJECTED" ? "(required)" : "(optional)"}</Label>
            <Textarea id="review-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
            <Button variant={decision?.type === "APPROVED" ? "default" : "destructive"} disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm {decision?.type === "APPROVED" ? "approval" : "rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
