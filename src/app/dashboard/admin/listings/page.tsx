"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Search, Eye, Flag, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, formatDateTime } from "@/lib/api-client";
import { labelFor, FOOD_CATEGORIES, QUANTITY_UNITS } from "@/lib/constants";

type AdminListing = {
  id: string; title: string; category: string; status: string; quantity: number; remainingQuantity: number;
  unit: string; district: string; pickupLocality: string; flaggedReason: string | null; createdAt: string;
  donor: { displayName: string; organizationName: string | null; email: string; verificationStatus: string };
};

export default function AdminListingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading, mutate } = useSWR<{ listings: AdminListing[] }>(
    `/api/admin/listings?${new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}) })}`
  );
  const [mod, setMod] = useState<{ l: AdminListing; action: "REMOVE" | "FLAG" | "RESTORE" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!mod) return;
    if (reason.trim().length < 5) return toast.error("A moderation reason is required.");
    setBusy(true);
    try {
      await api("/api/admin/listings", { method: "PATCH", json: { id: mod.l.id, action: mod.action, reason } });
      toast.success(`Listing ${mod.action === "RESTORE" ? "restored" : mod.action === "FLAG" ? "flagged" : "removed"}.`);
      setMod(null);
      setReason("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const listings = data?.listings ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Listings moderation</h1>
        <p className="text-sm text-muted-foreground">Review flagged content and remove unsafe or fraudulent listings. Open claims are cancelled and NGOs notified on removal.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or district…" className="pl-9" aria-label="Search listings" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Status filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED", "FLAGGED", "PICKED_UP", "COMPLETED", "EXPIRED", "WITHDRAWN", "DRAFT"].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : listings.length === 0 ? (
        <EmptyState icon={Search} title="No listings match" description="Adjust the search or status filter." />
      ) : (
        <div className="space-y-2.5">
          {listings.map((l) => (
            <div key={l.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{l.title}</p>
                    <ListingStatusBadge status={l.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {labelFor(FOOD_CATEGORIES, l.category)} · {l.remainingQuantity}/{l.quantity} {labelFor(QUANTITY_UNITS, l.unit)} · {l.pickupLocality}, {l.district} ·{" "}
                    {l.donor.organizationName ?? l.donor.displayName} ({l.donor.email}) · {l.donor.verificationStatus.toLowerCase()}
                  </p>
                  {l.flaggedReason && <p className="mt-1 text-xs font-medium text-destructive">Flag reason: {l.flaggedReason}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Created {formatDateTime(l.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                    <a href={`/explore/${l.id}`} target="_blank" rel="noreferrer"><Eye className="h-3 w-3" aria-hidden /> View</a>
                  </Button>
                  {["AVAILABLE", "PARTIALLY_RESERVED"].includes(l.status) && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { setMod({ l, action: "FLAG" }); setReason(""); }}>
                        <Flag className="h-3 w-3" aria-hidden /> Flag
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive" onClick={() => { setMod({ l, action: "REMOVE" }); setReason(""); }}>
                        <Trash2 className="h-3 w-3" aria-hidden /> Remove
                      </Button>
                    </>
                  )}
                  {["FLAGGED", "WITHDRAWN"].includes(l.status) && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { setMod({ l, action: "RESTORE" }); setReason(""); }}>
                      <RotateCcw className="h-3 w-3" aria-hidden /> Restore
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!mod} onOpenChange={(o) => !o && setMod(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mod?.action === "REMOVE" ? "Remove listing" : mod?.action === "FLAG" ? "Flag listing for review" : "Restore listing"} — {mod?.l.title}
            </DialogTitle>
            <DialogDescription>
              {mod?.action === "REMOVE"
                ? "The listing leaves public view immediately; open claims are cancelled with inventory restored and NGOs notified."
                : mod?.action === "FLAG"
                ? "Flagged listings are hidden from claim eligibility until reviewed."
                : "The listing returns to public view and becomes claimable."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="mod-reason">Reason (required, audited)</Label>
            <Textarea id="mod-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMod(null)}>Cancel</Button>
            <Button variant={mod?.action === "RESTORE" ? "default" : "destructive"} disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
