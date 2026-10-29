"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  MapPin, ClipboardList, PackageCheck, Users, Boxes, Search, Plus, Info, Loader2, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/stat-card";
import { ClaimStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendBarChart, CategoryPieChart } from "@/components/dashboard/charts";
import { api, formatDateTime, formatRelativeTime } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";

type Claim = {
  id: string; status: string; requestedQuantity: number; approvedQuantity: number | null;
  pickupCode: string | null; peopleToServe: number | null; createdAt: string; updatedAt: string;
  listing: {
    id: string; title: string; unit: string; district: string; pickupLocality: string;
    pickupDeadline: string; pickupStartAt: string; pickupAddress: string; contactInstructions: string;
    donor: { organizationName: string | null; displayName: string; phone: string | null };
  };
};

export default function NgoOverviewPage() {
  const { user } = useSession();
  const { data, isLoading, mutate } = useSWR<{
    claims: Claim[];
    stats: { nearbyListings: number; pendingClaims: number; confirmedPickups: number; completedCollections: number; quantityReceived: number; peopleServed: number };
    trend: Array<{ week: string; claims: number; received: number }>;
    byCategory: Array<{ category: string; count: number }>;
  }>("/api/dashboard/ngo/overview");

  const [codeInput, setCodeInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function confirmCollection(c: Claim) {
    setBusy(c.id);
    try {
      await api(`/api/claims/${c.id}`, { method: "PATCH", json: { action: "complete" } });
      toast.success("Collection confirmed — donation completed.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm collection.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const { stats } = data;
  const confirmed = data.claims.filter((c) => c.status === "ACCEPTED" || c.status === "READY_FOR_PICKUP");
  const pickedUp = data.claims.filter((c) => c.status === "PICKED_UP" || c.status === "DELIVERED");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NGO dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {user?.organizationName ?? "Your organization"} · {user?.verificationStatus === "VERIFIED" ? "Verified" : "Verification pending"}
          </p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/dashboard/ngo/browse"><Search className="h-4 w-4" aria-hidden /> Find food</Link>
        </Button>
      </div>

      {user?.verificationStatus !== "VERIFIED" && (
        <Alert className="border-[oklch(0.83_0.09_90)] bg-[oklch(0.83_0.09_90/0.12)]">
          <Info className="h-4 w-4 text-[oklch(0.45_0.09_70)]" />
          <AlertTitle>Verification required to claim food</AlertTitle>
          <AlertDescription>
            <Link href="/dashboard/ngo/profile" className="font-medium underline">Submit your verification documents</Link> — most reviews complete within 1–2 working days.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={MapPin} label="Nearby listings" value={stats.nearbyListings} tone="primary" hint={user?.displayName ? "your district" : undefined} />
        <StatCard icon={ClipboardList} label="Pending requests" value={stats.pendingClaims} tone={stats.pendingClaims > 0 ? "warning" : "default"} />
        <StatCard icon={PackageCheck} label="Confirmed pickups" value={stats.confirmedPickups} />
        <StatCard icon={PackageCheck} label="Completed collections" value={stats.completedCollections} />
        <StatCard icon={Boxes} label="Quantity received" value={stats.quantityReceived} hint="approved & collected" />
        <StatCard icon={Users} label="People served" value={stats.peopleServed} hint="self-reported" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendBarChart
          data={data.trend}
          keys={[{ key: "claims", label: "Claims made" }, { key: "received", label: "Quantity received" }]}
          title="Your collection activity"
          description="Last 4 weeks — claims submitted and quantities received."
        />
        <CategoryPieChart
          data={data.byCategory.length ? data.byCategory : [{ category: "No data", count: 1 }]}
          title="Claims by food category"
          description="What you've claimed, by category."
        />
      </div>

      {/* Active pickups with codes & addresses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active pickups</CardTitle>
          <CardDescription>Collection codes and exact addresses — visible only to your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {confirmed.length === 0 && pickedUp.length === 0 ? (
            <EmptyState icon={PackageCheck} title="No active pickups" description="Accepted claims appear here with collection codes and pickup instructions." actionLabel="Browse food" href="/dashboard/ngo/browse" className="py-8" />
          ) : (
            <ul className="max-h-96 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {[...confirmed, ...pickedUp].map((c) => (
                <li key={c.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{c.listing.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.listing.donor.organizationName ?? c.listing.donor.displayName} · {c.approvedQuantity ?? c.requestedQuantity} {c.listing.unit}
                      </p>
                    </div>
                    <ClaimStatusBadge status={c.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <p><span className="font-medium text-foreground">Pickup window:</span> {formatDateTime(c.listing.pickupStartAt)} → {formatDateTime(c.listing.pickupDeadline)}</p>
                    <p><span className="font-medium text-foreground">Contact:</span> {c.listing.donor.phone ?? "see instructions"}</p>
                    <p className="sm:col-span-2"><span className="font-medium text-foreground">Address:</span> {c.listing.pickupAddress || "—"}</p>
                    {c.listing.contactInstructions && <p className="sm:col-span-2"><span className="font-medium text-foreground">Instructions:</span> {c.listing.contactInstructions}</p>}
                  </div>
                  {c.pickupCode && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
                      <KeyRound className="h-3.5 w-3.5" aria-hidden /> Collection code: {c.pickupCode}
                    </p>
                  )}
                  {c.status === "PICKED_UP" && (
                    <Button size="sm" className="mt-3 w-full sm:w-auto" disabled={busy === c.id} onClick={() => confirmCollection(c)}>
                      {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Confirm collection complete
                    </Button>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">Requested {formatRelativeTime(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent claims table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All my claims</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.claims.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No claims yet — browse available food to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5 font-medium">Food</th>
                    <th className="px-6 py-2.5 font-medium">Quantity</th>
                    <th className="px-6 py-2.5 font-medium">Status</th>
                    <th className="px-6 py-2.5 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.claims.slice(0, 8).map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="max-w-48 truncate px-6 py-3 font-medium">{c.listing.title}</td>
                      <td className="px-6 py-3 tabular-nums">{c.approvedQuantity ?? c.requestedQuantity} {c.listing.unit}</td>
                      <td className="px-6 py-3"><ClaimStatusBadge status={c.status} /></td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{formatRelativeTime(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
