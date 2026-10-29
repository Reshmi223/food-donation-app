"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bike, MapPin, PackageCheck, Camera, Loader2, CheckCircle2, Clock, History as HistoryIcon, Bike as BikeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatDateTime, formatRelativeTime } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";

type Assignment = {
  id: string; status: string; dropoffAddress: string | null; dropoffNotes: string | null;
  pickupNotes: string | null; proofUploadId: string | null; assignedAt: string; completedAt: string | null;
  claim: {
    id: string; approvedQuantity: number | null; status: string;
    listing: { id: string; title: string; pickupLocality: string; district: string; pickupDeadline: string; unit: string; images: string | null; pickupAddress?: string };
    ngo: { organizationName: string | null; displayName: string; locality: string | null; district: string | null };
  };
};

const FLOW = ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "PICKED_UP", "DELIVERED", "VERIFIED_COMPLETE"] as const;

const NEXT_ACTION: Partial<Record<string, { label: string; to: string; needsProof?: boolean }>> = {
  ASSIGNED: { label: "Accept assignment", to: "ACCEPTED" },
  ACCEPTED: { label: "I'm on the way", to: "ON_THE_WAY" },
  ON_THE_WAY: { label: "Food picked up", to: "PICKED_UP" },
  PICKED_UP: { label: "Mark delivered", to: "DELIVERED", needsProof: true },
};

function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export default function VolunteerPage() {
  const { user } = useSession();
  const { data, isLoading, mutate } = useSWR<{ assignments: Assignment[] }>("/api/volunteer/assignments");
  const [busy, setBusy] = useState<string | null>(null);
  const [proofFor, setProofFor] = useState<Assignment | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffNotes, setDropoffNotes] = useState("");
  const [proofId, setProofId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function transition(a: Assignment, to: string) {
    setBusy(a.id);
    try {
      await api(`/api/volunteer/assignments/${a.id}`, { method: "PATCH", json: { status: to } });
      toast.success(`Status updated: ${statusLabel(to)}`);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  function openProof(a: Assignment) {
    setProofFor(a);
    setDropoffAddress(a.dropoffAddress ?? "");
    setDropoffNotes(a.dropoffNotes ?? "");
    setProofId(a.proofUploadId ?? null);
  }

  async function uploadProof(file: File) {
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api<{ id: string }>("/api/uploads", {
        method: "POST",
        json: { data: dataUrl, purpose: "PROOF_OF_DELIVERY", filename: file.name },
      });
      setProofId(res.id);
      toast.success("Proof photo attached.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submitProof() {
    if (!proofFor) return;
    if (!dropoffAddress.trim() || dropoffAddress.trim().length < 6) {
      toast.error("Enter the drop-off location.");
      return;
    }
    if (!proofId) {
      toast.error("Attach a proof-of-delivery photo.");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/volunteer/assignments/${proofFor.id}`, {
        method: "PATCH",
        json: { status: "DELIVERED", dropoffAddress, dropoffNotes: dropoffNotes || undefined, proofUploadId: proofId },
      });
      toast.success("Delivery recorded — thank you!");
      setProofFor(null);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  const assignments = data?.assignments ?? [];
  const active = assignments.filter((a) => !["VERIFIED_COMPLETE", "CANCELLED"].includes(a.status));
  const done = assignments.filter((a) => ["VERIFIED_COMPLETE", "CANCELLED"].includes(a.status));

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
          <h1 className="text-2xl font-bold tracking-tight">My deliveries</h1>
          <p className="text-sm text-muted-foreground">
            {user?.available !== false ? "You are available for new assignments." : "You are currently marked unavailable."}{" "}
            <Link href="/dashboard/volunteer/profile" className="text-primary underline">Change availability</Link>
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-primary/5">
          <Bike className="h-3.5 w-3.5" aria-hidden /> {done.filter((a) => a.status === "VERIFIED_COMPLETE").length} completed
        </Badge>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="history">History ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {active.length === 0 ? (
            <EmptyState icon={Bike} title="No active assignments" description="When a donor assigns you a delivery, it appears here with pickup and drop-off details." />
          ) : (
            active.map((a) => {
              const next = NEXT_ACTION[a.status];
              const flowIdx = FLOW.indexOf(a.status as (typeof FLOW)[number]);
              return (
                <Card key={a.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm">{a.claim.listing.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {a.claim.listing.pickupLocality} → {a.claim.ngo.organizationName ?? a.claim.ngo.displayName}
                          {a.claim.ngo.locality ? `, ${a.claim.ngo.locality}` : ""} · {a.claim.approvedQuantity ?? "—"} {a.claim.listing.unit}
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary/10 text-primary">{statusLabel(a.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {/* Progress flow */}
                    <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {FLOW.map((s, i) => (
                        <li key={s} className="flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${i <= flowIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {statusLabel(s)}
                          </span>
                          {i < FLOW.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
                        </li>
                      ))}
                    </ol>

                    <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground sm:grid-cols-2">
                      <p><span className="font-medium text-foreground">Pickup:</span> {a.claim.listing.pickupAddress ?? `${a.claim.listing.pickupLocality}, ${a.claim.listing.district}`}</p>
                      <p><span className="font-medium text-foreground">Drop-off:</span> {a.dropoffAddress ?? "—"}</p>
                      <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> Deadline {formatDateTime(a.claim.listing.pickupDeadline)}</p>
                      <p><span className="font-medium text-foreground">Pickup code:</span> shared by donor at collection</p>
                      {a.dropoffNotes && <p className="sm:col-span-2"><span className="font-medium text-foreground">Notes:</span> {a.dropoffNotes}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {next && (
                        <Button size="sm" disabled={busy === a.id} onClick={() => (next.needsProof ? openProof(a) : transition(a, next.to))}>
                          {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PackageCheck className="h-4 w-4" aria-hidden />}
                          {next.label}
                        </Button>
                      )}
                      {["ASSIGNED", "ACCEPTED", "ON_THE_WAY"].includes(a.status) && (
                        <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => transition(a, "CANCELLED")}>
                          Can&rsquo;t make it
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Assigned {formatRelativeTime(a.assignedAt)}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          {done.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="No delivery history yet" description="Completed deliveries build your verified rescue record." />
          ) : (
            done.map((a) => (
              <Card key={a.id} className="py-4">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{a.claim.listing.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.claim.listing.pickupLocality} → {a.claim.ngo.organizationName ?? a.claim.ngo.displayName} ·{" "}
                      {a.completedAt ? formatDateTime(a.completedAt) : "—"}
                    </p>
                  </div>
                  <Badge variant={a.status === "VERIFIED_COMPLETE" ? "outline" : "secondary"} className={a.status === "VERIFIED_COMPLETE" ? "gap-1 bg-primary/10 text-primary" : ""}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {statusLabel(a.status)}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Proof of delivery dialog */}
      <Dialog open={!!proofFor} onOpenChange={(o) => !o && setProofFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm delivery</DialogTitle>
            <DialogDescription>Authorized proof-of-delivery: attach a drop-off photo and location.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="po-drop">Drop-off location</Label>
              <Input id="po-drop" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} placeholder="Where was the food delivered?" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="po-notes">Notes (optional)</Label>
              <Input id="po-notes" value={dropoffNotes} onChange={(e) => setDropoffNotes(e.target.value)} />
            </div>
            <div>
              <Label>Proof photo (required)</Label>
              <div className="mt-2 flex items-center gap-3">
                {proofId ? (
                  
                  <img src={`/api/uploads/${proofId}`} alt="Proof of delivery" className="h-20 w-20 rounded-lg border object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                    <Camera className="h-6 w-6" aria-hidden />
                  </div>
                )}
                <label className="cursor-pointer rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  {uploading ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden /> : <Camera className="mr-1 inline h-3.5 w-3.5" aria-hidden />}
                  {proofId ? "Replace photo" : "Attach photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofFor(null)}>Cancel</Button>
            <Button onClick={submitProof} disabled={submitting || uploading}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
              Mark delivered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
