"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardList, KeyRound, XCircle, PackageCheck, Phone, MapPin, Clock,
  History as HistoryIcon, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ClaimStatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api, formatDateTime, formatRelativeTime } from "@/lib/api-client";

type Claim = {
  id: string; status: string; requestedQuantity: number; approvedQuantity: number | null;
  peopleToServe: number | null; pickupCode: string | null; collectionNotes: string | null;
  rejectionReason: string | null; createdAt: string; updatedAt: string;
  listing: {
    id: string; title: string; unit: string; district: string; pickupLocality: string;
    pickupDeadline: string; pickupStartAt: string; pickupAddress: string; contactInstructions: string;
    donor: { organizationName: string | null; displayName: string; phone: string | null };
  };
  volunteerAssignments: Array<{ id: string; status: string; dropoffAddress: string | null }>;
  statusHistory: Array<{ previousStatus: string | null; newStatus: string; reason: string | null; createdAt: string; actor?: { displayName: string } }>;
};

function label(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export default function NgoClaimsPage() {
  const { data, isLoading, mutate } = useSWR<{ claims: Claim[] }>("/api/claims");
  const [cancelFor, setCancelFor] = useState<Claim | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeFor, setDisputeFor] = useState<Claim | null>(null);
  const [disputeText, setDisputeText] = useState("");
  const [historyFor, setHistoryFor] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);

  const claims = data?.claims ?? [];
  const open = claims.filter((c) => ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP"].includes(c.status));
  const inProgress = claims.filter((c) => ["PICKED_UP", "DELIVERED"].includes(c.status));
  const closed = claims.filter((c) => ["COMPLETED", "REJECTED", "CANCELLED", "DISPUTED"].includes(c.status));

  async function cancelClaim() {
    if (!cancelFor) return;
    setBusy(true);
    try {
      await api(`/api/claims/${cancelFor.id}`, { method: "PATCH", json: { action: "cancel", reason: cancelReason || undefined } });
      toast.success("Claim cancelled. Reserved inventory was released back to the donor.");
      setCancelFor(null);
      setCancelReason("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel claim.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDispute() {
    if (!disputeFor) return;
    if (disputeText.trim().length < 15) return toast.error("Describe the issue in at least 15 characters.");
    setBusy(true);
    try {
      await api(`/api/claims/${disputeFor.id}`, { method: "PATCH", json: { action: "dispute", reason: disputeText } });
      toast.success("Dispute filed — administrators will review.");
      setDisputeFor(null);
      setDisputeText("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not file dispute.");
    } finally {
      setBusy(false);
    }
  }

  const ClaimCard = ({ c }: { c: Claim }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm"><Link href={`/explore/${c.listing.id}`} className="hover:underline">{c.listing.title}</Link></CardTitle>
            <CardDescription className="mt-1">
              {c.listing.donor.organizationName ?? c.listing.donor.displayName} · {c.approvedQuantity ?? c.requestedQuantity} {c.listing.unit}
              {c.peopleToServe ? ` · ~${c.peopleToServe} people` : ""}
            </CardDescription>
          </div>
          <ClaimStatusBadge status={c.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" aria-hidden /> {c.listing.pickupLocality}, {c.listing.district}</p>
          <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" aria-hidden /> Pickup by {formatDateTime(c.listing.pickupDeadline)}</p>
        </div>

        {/* Authorized details appear only after acceptance */}
        {["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP", "COMPLETED", "DELIVERED"].includes(c.status) && (
          <div className="grid gap-1.5 rounded-lg bg-muted/50 p-3 text-xs">
            <p><span className="font-medium text-foreground">Address:</span> {c.listing.pickupAddress || "Shared by donor at pickup time"}</p>
            {c.listing.contactInstructions && <p><span className="font-medium text-foreground">Instructions:</span> {c.listing.contactInstructions}</p>}
            {c.listing.donor.phone && (
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" aria-hidden /> {c.listing.donor.phone}</p>
            )}
            {c.pickupCode && (
              <p className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/8 px-2.5 py-1 font-semibold text-primary">
                <KeyRound className="h-3.5 w-3.5" aria-hidden /> Collection code: {c.pickupCode}
              </p>
            )}
          </div>
        )}

        {c.volunteerAssignments.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Volunteer delivery: <span className="font-medium">{label(c.volunteerAssignments[0].status)}</span>
            {c.volunteerAssignments[0].dropoffAddress ? ` → ${c.volunteerAssignments[0].dropoffAddress}` : ""}
          </p>
        )}
        {c.rejectionReason && <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">Donor note: {c.rejectionReason}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {c.status === "REQUESTED" && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setCancelFor(c)}>
              <XCircle className="h-3.5 w-3.5" aria-hidden /> Cancel request
            </Button>
          )}
          {c.status === "ACCEPTED" && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setCancelFor(c)}>
              <XCircle className="h-3.5 w-3.5" aria-hidden /> Cancel (release food)
            </Button>
          )}
          {c.status === "PICKED_UP" && (
            <Button size="sm" className="gap-1" onClick={() => api(`/api/claims/${c.id}`, { method: "PATCH", json: { action: "complete" } }).then(() => { toast.success("Collection confirmed — thank you!"); mutate(); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed."))}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Confirm collection
            </Button>
          )}
          {["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP", "COMPLETED"].includes(c.status) && (
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDisputeFor(c)}>
              Report a problem
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto gap-1 text-xs" onClick={() => setHistoryFor(c)}>
            <HistoryIcon className="h-3.5 w-3.5" aria-hidden /> History
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My claims</h1>
          <p className="text-sm text-muted-foreground">Track requests, collection codes and completions.</p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/dashboard/ngo/browse">Browse food</Link>
        </Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="progress">In progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
          <TabsTrigger value="all">All ({claims.length})</TabsTrigger>
        </TabsList>
        {[
          ["open", open, "No open claims"],
          ["progress", inProgress, "Nothing in progress"],
          ["closed", closed, "No closed claims yet"],
          ["all", claims, "No claims yet"],
        ].map(([key, list, emptyMsg]) => (
          <TabsContent key={key as string} value={key as string} className="mt-4 space-y-4">
            {(list as Claim[]).length === 0 ? (
              <EmptyState icon={ClipboardList} title={emptyMsg as string} description="Claims you make on available food listings appear here." actionLabel="Browse food" href="/dashboard/ngo/browse" />
            ) : (
              (list as Claim[]).map((c) => <ClaimCard key={c.id} c={c} />)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Cancel dialog */}
      <Dialog open={!!cancelFor} onOpenChange={(o) => !o && setCancelFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this claim?</DialogTitle>
            <DialogDescription>
              {cancelFor?.status === "REQUESTED"
                ? "The request will be withdrawn."
                : "Reserved inventory will be released back to the donor so others can claim it."}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (optional)" aria-label="Cancellation reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFor(null)}>Keep claim</Button>
            <Button variant="destructive" disabled={busy} onClick={cancelClaim}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Cancel claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={!!disputeFor} onOpenChange={(o) => !o && setDisputeFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a problem with this claim</DialogTitle>
            <DialogDescription>
              Food safety issues should also be reported via the listing page. Disputes are reviewed by administrators.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={disputeText} onChange={(e) => setDisputeText(e.target.value)} placeholder="What went wrong?" aria-label="Dispute description" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeFor(null)}>Close</Button>
            <Button variant="destructive" disabled={busy} onClick={submitDispute}>File dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Status history</DialogTitle>
            <DialogDescription>{historyFor?.listing.title}</DialogDescription>
          </DialogHeader>
          <ol className="max-h-72 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {historyFor?.statusHistory.map((h, i) => (
              <li key={i} className="border-l-2 border-primary/30 pl-3 text-sm">
                <p className="font-medium">{h.previousStatus ? `${label(h.previousStatus)} → ` : ""}{label(h.newStatus)}</p>
                {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                <p className="text-[11px] text-muted-foreground">{formatDateTime(h.createdAt)}{h.actor ? ` · ${h.actor.displayName}` : ""}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
