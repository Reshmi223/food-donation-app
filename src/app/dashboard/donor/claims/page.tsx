"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardList, Check, X, PackageCheck, Phone, MapPin, Bike, Sparkles,
  Loader2, History as HistoryIcon, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ClaimStatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatDateTime, formatRelativeTime } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";

type Claim = {
  id: string;
  status: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  peopleToServe: number | null;
  collectionNotes: string | null;
  intendedPickupAt: string | null;
  pickupCode: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string; title: string; unit: string; quantity: number; remainingQuantity: number;
    pickupLocality: string; district: string; pickupDeadline: string;
    donor?: { id: string; phone: string | null; organizationName: string | null };
  };
  ngo: { id: string; displayName: string; organizationName: string | null; verificationStatus: string; phone: string | null };
  statusHistory: Array<{ previousStatus: string | null; newStatus: string; reason: string | null; createdAt: string; actor?: { displayName: string } }>;
  volunteerAssignments: Array<{ id: string; status: string }>;
};

type MatchResult = {
  data: Array<{ ngoId: string; ngoName: string; score: number; explanation: string[] }>;
  note?: string;
};

export default function DonorClaimsPage() {
  const { user } = useSession();
  const { data, isLoading, mutate } = useSWR<{ claims: Claim[] }>("/api/claims");
  const [action, setAction] = useState<{ claim: Claim; type: "reject" | "ready" | "picked_up" | "assign" } | null>(null);
  const [reason, setReason] = useState("");
  const [approveQty, setApproveQty] = useState("");
  const [volunteers, setVolunteers] = useState<Array<{ id: string; displayName: string; district: string | null }>>([]);
  const [volunteerId, setVolunteerId] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchFor, setMatchFor] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [historyClaim, setHistoryClaim] = useState<Claim | null>(null);

  const claims = data?.claims ?? [];
  const pending = claims.filter((c) => c.status === "REQUESTED");
  const active = claims.filter((c) => ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"].includes(c.status));

  async function patchClaim(id: string, json: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    try {
      await api(`/api/claims/${id}`, { method: "PATCH", json });
      toast.success(successMsg);
      mutate();
      setAction(null);
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function openAssign(claim: Claim) {
    setAction({ claim, type: "assign" });
    setVolunteerId("");
    setDropoffAddress(claim.ngo.organizationName ? `${claim.ngo.organizationName}` : "");
    api<{ volunteers: Array<{ id: string; displayName: string; district: string | null }> }>("/api/volunteers")
      .then((res) => setVolunteers(res.volunteers))
      .catch(() => setVolunteers([]));
  }

  async function submitAssign() {
    if (!action) return;
    if (!volunteerId) {
      toast.error("Select a volunteer.");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/claims/${action.claim.id}/assign-volunteer`, {
        method: "POST",
        json: { volunteerId, dropoffAddress },
      });
      toast.success("Volunteer assigned.");
      mutate();
      setAction(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign volunteer.");
    } finally {
      setBusy(false);
    }
  }

  async function showMatches(listingId: string) {
    setMatchFor(listingId);
    setMatchLoading(true);
    setMatches(null);
    try {
      setMatches(await api<MatchResult>(`/api/ai/match?listingId=${listingId}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Matching unavailable.");
    } finally {
      setMatchLoading(false);
    }
  }

  const ClaimCard = ({ c }: { c: Claim }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm">
              <Link href={`/explore/${c.listing.id}`} className="hover:underline">{c.listing.title}</Link>
            </CardTitle>
            <CardDescription className="mt-1">
              {c.ngo.organizationName ?? c.ngo.displayName} · {c.ngo.verificationStatus === "VERIFIED" ? "Verified NGO" : "Unverified"}
              {c.peopleToServe ? ` · serves ~${c.peopleToServe} people` : ""}
            </CardDescription>
          </div>
          <ClaimStatusBadge status={c.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p><span className="text-muted-foreground">Requested:</span> <strong>{c.requestedQuantity} {c.listing.unit}</strong>{c.approvedQuantity != null && c.approvedQuantity !== c.requestedQuantity ? ` (approved: ${c.approvedQuantity})` : ""}</p>
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" aria-hidden /> {c.listing.pickupLocality}, {c.listing.district}</p>
          <p><span className="text-muted-foreground">Intended pickup:</span> {c.intendedPickupAt ? formatDateTime(c.intendedPickupAt) : "—"}</p>
          <p><span className="text-muted-foreground">Deadline:</span> {formatDateTime(c.listing.pickupDeadline)}</p>
        </div>
        {c.collectionNotes && <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">&ldquo;{c.collectionNotes}&rdquo;</p>}
        {c.rejectionReason && <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">Reason: {c.rejectionReason}</p>}
        {c.pickupCode && ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"].includes(c.status) && (
          <p className="rounded-lg bg-primary/5 p-2.5 text-xs">
            <span className="font-medium text-primary">Collection code: {c.pickupCode}</span> — verify at handover.
          </p>
        )}
        {c.volunteerAssignments.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bike className="h-3.5 w-3.5" aria-hidden /> Volunteer delivery: {c.volunteerAssignments[0].status.replace(/_/g, " ").toLowerCase()}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {c.status === "REQUESTED" && (
            <>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setAction({ claim: c, type: "ready" });
                  setApproveQty(String(c.requestedQuantity));
                }}
              >
                <Check className="h-3.5 w-3.5" aria-hidden /> Accept
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setAction({ claim: c, type: "reject" })}>
                <X className="h-3.5 w-3.5" aria-hidden /> Reject
              </Button>
              {c.ngo.verificationStatus !== "VERIFIED" && (
                <span className="flex items-center gap-1 text-xs text-destructive"><ShieldAlert className="h-3.5 w-3.5" aria-hidden /> NGO not verified</span>
              )}
            </>
          )}
          {c.status === "ACCEPTED" && (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setAction({ claim: c, type: "ready" }); setReason(""); }}>
                <PackageCheck className="h-3.5 w-3.5" aria-hidden /> Mark ready for pickup
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => patchClaim(c.id, { action: "picked_up" }, "Marked as picked up.")}>
                Picked up
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => openAssign(c)}>
                <Bike className="h-3.5 w-3.5" aria-hidden /> Assign volunteer
              </Button>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setAction({ claim: c, type: "reject" }); setReason(""); }}>
                <X className="h-3.5 w-3.5" aria-hidden /> Cancel (restore stock)
              </Button>
            </>
          )}
          {c.status === "READY_FOR_PICKUP" && (
            <>
              <Button size="sm" className="gap-1" onClick={() => patchClaim(c.id, { action: "picked_up" }, "Marked as picked up.")}>
                <PackageCheck className="h-3.5 w-3.5" aria-hidden /> Confirm picked up
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => openAssign(c)}>
                <Bike className="h-3.5 w-3.5" aria-hidden /> Assign volunteer
              </Button>
            </>
          )}
          {c.ngo.phone && ["ACCEPTED", "READY_FOR_PICKUP"].includes(c.status) && (
            <a href={`tel:${c.ngo.phone}`} className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-muted">
              <Phone className="h-3.5 w-3.5" aria-hidden /> {c.ngo.phone}
            </a>
          )}
          <Button size="sm" variant="ghost" className="ml-auto gap-1 text-xs" onClick={() => setHistoryClaim(c)}>
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
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Claim requests</h1>
        <p className="text-sm text-muted-foreground">Review NGO requests, approve quantities and coordinate handovers.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="all">All ({claims.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-4">
          {pending.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No pending requests" description="New claim requests from verified NGOs appear here." />
          ) : (
            pending.map((c) => <ClaimCard key={c.id} c={c} />)
          )}
        </TabsContent>
        <TabsContent value="active" className="mt-4 space-y-4">
          {active.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No active claims" description="Accepted claims move here until they're completed." />
          ) : (
            active.map((c) => <ClaimCard key={c.id} c={c} />)
          )}
        </TabsContent>
        <TabsContent value="all" className="mt-4 space-y-4">
          {claims.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No claims yet" description="Publish a listing to start receiving claim requests." actionLabel="Create listing" href="/dashboard/donor/listings/new" />
          ) : (
            claims.map((c) => <ClaimCard key={c.id} c={c} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Accept dialog */}
      <Dialog open={action?.type === "ready"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept claim</DialogTitle>
            <DialogDescription>
              Approve the quantity to reserve. &ldquo;{action?.claim.listing.title}&rdquo; has {action?.claim.listing.remainingQuantity} {action?.claim.listing.unit.toLowerCase()} remaining.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="approve-qty">Approved quantity ({action?.claim.listing.unit.toLowerCase()})</Label>
              <Input id="approve-qty" type="number" min={1} max={action?.claim.listing.remainingQuantity ?? undefined} value={approveQty} onChange={(e) => setApproveQty(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              The inventory is reserved atomically on acceptance and restored automatically if this claim is later cancelled or rejected.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={() =>
                action &&
                patchClaim(
                  action.claim.id,
                  { action: "accept", approvedQuantity: Number(approveQty) },
                  `Claim accepted (${approveQty} ${action.claim.listing.unit.toLowerCase()} reserved).`
                )
              }
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Accept claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={action?.type === "reject"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject claim</DialogTitle>
            <DialogDescription>
              Let the NGO know why (optional but helpful). Reserved inventory is restored automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. This batch was already promised elsewhere…" aria-label="Rejection reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Keep claim</Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => action && patchClaim(action.claim.id, { action: "reject", reason: reason || undefined }, "Claim rejected.")}
            >
              Reject claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign volunteer dialog */}
      <Dialog open={action?.type === "assign"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign delivery volunteer</DialogTitle>
            <DialogDescription>The volunteer sees pickup details and drop-off only for this assignment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Verified volunteer</Label>
              <Select value={volunteerId} onValueChange={setVolunteerId}>
                <SelectTrigger aria-label="Volunteer"><SelectValue placeholder="Select volunteer…" /></SelectTrigger>
                <SelectContent>
                  {volunteers.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">No verified volunteers available yet.</p>
                  ) : (
                    volunteers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.displayName} {v.district ? `· ${v.district}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dropoff">Drop-off address</Label>
              <Textarea id="dropoff" rows={2} value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} placeholder="Where should the food be delivered?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button disabled={busy} onClick={submitAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI matching dialog */}
      <Dialog open={!!matchFor} onOpenChange={(o) => !o && setMatchFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Suggested NGOs
              <Badge variant="outline" className="text-[10px] uppercase">AI estimate</Badge>
            </DialogTitle>
            <DialogDescription>
              Transparent ranking by district, capacity, preferences and verification. Suggestions never auto-assign food.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {matchLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden /></div>
            ) : matches?.data.length ? (
              matches.data.map((m) => (
                <div key={m.ngoId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{m.ngoName}</p>
                    <Badge variant="secondary">{m.score}/100</Badge>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {m.explanation.map((ex, i) => (
                      <li key={i} className="text-xs text-muted-foreground">· {ex}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No NGO suggestions available for this listing.</p>
            )}
          </div>
          {matches?.note && <p className="text-xs text-muted-foreground">{matches.note}</p>}
        </DialogContent>
      </Dialog>

      {/* Status history dialog */}
      <Dialog open={!!historyClaim} onOpenChange={(o) => !o && setHistoryClaim(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Status history</DialogTitle>
            <DialogDescription>{historyClaim?.listing.title}</DialogDescription>
          </DialogHeader>
          <ol className="max-h-72 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {historyClaim?.statusHistory.map((h, i) => (
              <li key={i} className="border-l-2 border-primary/30 pl-3 text-sm">
                <p className="font-medium">
                  {h.previousStatus ? claimStatusLabelPrev(h.previousStatus) + " → " : ""}
                  {claimStatusLabelPrev(h.newStatus)}
                </p>
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

function claimStatusLabelPrev(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
