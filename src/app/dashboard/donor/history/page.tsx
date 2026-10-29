"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { History, Download, Pencil, Trash2, Loader2, PackageCheck, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ListingStatusBadge, ClaimStatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api, formatDateTime, formatRelativeTime } from "@/lib/api-client";
import { labelFor, FOOD_CATEGORIES, QUANTITY_UNITS } from "@/lib/constants";

type Listing = {
  id: string; title: string; category: string; status: string; quantity: number;
  remainingQuantity: number; unit: string; pickupLocality: string; district: string;
  pickupDeadline: string; createdAt: string; donorConfirmed: boolean;
};

type Claim = {
  id: string; status: string; requestedQuantity: number; approvedQuantity: number | null;
  createdAt: string; updatedAt: string;
  listing: { id: string; title: string; unit: string };
  ngo: { displayName: string; organizationName: string | null };
};

export default function DonorHistoryPage() {
  const { data, isLoading, mutate } = useSWR<{ listings: Listing[]; claims: Claim[] }>("/api/dashboard/donor/overview");
  const [withdraw, setWithdraw] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmWithdraw() {
    if (!withdraw) return;
    setBusy(true);
    try {
      await api(`/api/listings/${withdraw.id}`, { method: "DELETE" });
      toast.success("Listing withdrawn — open claims were cancelled and NGOs notified.");
      setWithdraw(null);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not withdraw listing.");
    } finally {
      setBusy(false);
    }
  }

  const listings = data?.listings ?? [];
  const claims = data?.claims ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donation history</h1>
          <p className="text-sm text-muted-foreground">All your listings and their rescue outcomes.</p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => { window.location.href = "/api/analytics/export?type=listings"; toast.success("Report download started."); }}>
          <Download className="h-4 w-4" aria-hidden /> Listings CSV
        </Button>
      </div>

      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
          <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {listings.length === 0 ? (
            <EmptyState icon={History} title="No listings yet" description="Create your first surplus food listing to build your donation history." actionLabel="Create listing" href="/dashboard/donor/listings/new" />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Food</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                      <td className="max-w-56 px-4 py-3">
                        <Link href={`/explore/${l.id}`} className="truncate font-medium hover:underline">{l.title}</Link>
                        <p className="text-xs text-muted-foreground">{l.pickupLocality}, {l.district}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{labelFor(FOOD_CATEGORIES, l.category)}</td>
                      <td className="px-4 py-3 tabular-nums">{l.remainingQuantity}/{l.quantity} {labelFor(QUANTITY_UNITS, l.unit)}</td>
                      <td className="px-4 py-3"><ListingStatusBadge status={l.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(l.pickupDeadline)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        {["DRAFT", "AVAILABLE", "PARTIALLY_RESERVED"].includes(l.status) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${l.title}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/donor/listings/${l.id}/edit`}><Pencil className="mr-2 h-3.5 w-3.5" aria-hidden /> Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setWithdraw(l)}>
                                <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden /> Withdraw
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          {claims.length === 0 ? (
            <EmptyState icon={PackageCheck} title="No claims yet" description="Claim activity on your listings will appear here." />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Food</th>
                    <th className="px-4 py-3 font-medium">NGO</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                      <td className="max-w-56 truncate px-4 py-3 font-medium">{c.listing.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.ngo.organizationName ?? c.ngo.displayName}</td>
                      <td className="px-4 py-3 tabular-nums">{c.approvedQuantity ?? c.requestedQuantity} {c.listing.unit}</td>
                      <td className="px-4 py-3"><ClaimStatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!withdraw} onOpenChange={(o) => !o && setWithdraw(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw listing?</DialogTitle>
            <DialogDescription>
              &ldquo;{withdraw?.title}&rdquo; will be removed from public view. Open claim requests are cancelled and the NGOs are notified. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdraw(null)}>Keep listing</Button>
            <Button variant="destructive" disabled={busy} onClick={confirmWithdraw}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
