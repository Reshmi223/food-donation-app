"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  UtensilsCrossed, Package, ClipboardList, CheckCircle2, Boxes, Percent,
  Plus, Download, Sparkles, ArrowRight, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/stat-card";
import { ClaimStatusBadge, ListingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendBarChart, CategoryPieChart } from "@/components/dashboard/charts";
import { api, formatRelativeTime } from "@/lib/api-client";
import { claimStatusLabel } from "@/lib/claims";
import { toast } from "sonner";

type DonorClaim = {
  id: string;
  status: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  createdAt: string;
  listing: { id: string; title: string; unit: string; district: string };
  ngo: { displayName: string; organizationName: string | null; verificationStatus: string };
};

type OverviewData = {
  claims: DonorClaim[];
  listings: Array<{ id: string; title: string; status: string; remainingQuantity: number; quantity: number; unit: string; pickupDeadline: string }>;
  stats: {
    activeListings: number;
    availableQuantity: number;
    pendingClaims: number;
    completedDonations: number;
    totalRescued: number;
    acceptanceRate: number;
    unit: string;
  };
};

export default function DonorOverviewPage() {
  const { data, isLoading, mutate } = useSWR<OverviewData>("/api/dashboard/donor/overview");

  async function decideClaim(claimId: string, action: "accept" | "reject", approvedQuantity?: number) {
    try {
      await api(`/api/claims/${claimId}`, {
        method: "PATCH",
        json: { action, approvedQuantity },
      });
      toast.success(action === "accept" ? "Claim accepted — inventory reserved." : "Claim rejected.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
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
  const pending = data.claims.filter((c) => c.status === "REQUESTED");
  const recent = data.claims.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donor dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your listings, claims and rescue impact.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-1.5">
            <a href="/api/analytics/export?type=donations" download>
              <Download className="h-4 w-4" aria-hidden /> Report
            </a>
          </Button>
          <Button asChild className="gap-1.5">
            <Link href="/dashboard/donor/listings/new">
              <Plus className="h-4 w-4" aria-hidden /> New listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={UtensilsCrossed} label="Active listings" value={stats.activeListings} tone="primary" />
        <StatCard icon={Package} label="Available quantity" value={`${stats.availableQuantity} ${stats.unit}`} />
        <StatCard icon={ClipboardList} label="Pending claims" value={stats.pendingClaims} tone={stats.pendingClaims > 0 ? "warning" : "default"} />
        <StatCard icon={CheckCircle2} label="Completed donations" value={stats.completedDonations} />
        <StatCard icon={Boxes} label="Total rescued" value={`${stats.totalRescued} ${stats.unit}`} hint="approved & completed" />
        <StatCard icon={Percent} label="Acceptance rate" value={`${stats.acceptanceRate}%`} hint="last 90 days" />
      </div>

      {/* Charts */}
      <ChartsBlock />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending claims needing action */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Claim requests needing action</CardTitle>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/dashboard/donor/claims">View all <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
              </Button>
            </div>
            <CardDescription>{pending.length} pending request{pending.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No pending requests" description="When verified NGOs request your food, review them here." className="py-8" />
            ) : (
              <ul className="max-h-96 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                {pending.map((c) => (
                  <li key={c.id} className="rounded-lg border p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.listing.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.ngo.organizationName ?? c.ngo.displayName} · {c.requestedQuantity} {c.listing.unit} · {formatRelativeTime(c.createdAt)}
                        </p>
                      </div>
                      {c.ngo.verificationStatus === "VERIFIED" ? (
                        <ClaimStatusBadge status={c.status} />
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">NGO unverified</span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => decideClaim(c.id, "accept")}>
                        Accept {c.requestedQuantity} {c.listing.unit}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => decideClaim(c.id, "reject", undefined)}>
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* My listings quick view */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My listings</CardTitle>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/dashboard/donor/history">History <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.listings.length === 0 ? (
              <EmptyState icon={UtensilsCrossed} title="No listings yet" description="Publish your first surplus food listing to start rescuing." actionLabel="Create listing" href="/dashboard/donor/listings/new" className="py-8" />
            ) : (
              <ul className="max-h-96 space-y-2.5 overflow-y-auto pr-1 scrollbar-thin">
                {data.listings.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/dashboard/donor/listings/${l.id}/edit`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.remainingQuantity}/{l.quantity} {l.unit} left · deadline {formatRelativeTime(l.pickupDeadline)}
                        </p>
                      </div>
                      <ListingStatusBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent claims */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent claim activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No claim activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5 font-medium">Food</th>
                    <th className="px-6 py-2.5 font-medium">NGO</th>
                    <th className="px-6 py-2.5 font-medium">Quantity</th>
                    <th className="px-6 py-2.5 font-medium">Status</th>
                    <th className="px-6 py-2.5 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="max-w-48 truncate px-6 py-3 font-medium">{c.listing.title}</td>
                      <td className="px-6 py-3 text-muted-foreground">{c.ngo.organizationName ?? c.ngo.displayName}</td>
                      <td className="px-6 py-3 tabular-nums">
                        {c.approvedQuantity ?? c.requestedQuantity} {c.listing.unit}
                      </td>
                      <td className="px-6 py-3"><ClaimStatusBadge status={c.status} /></td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{formatRelativeTime(c.createdAt)}</td>
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

function ChartsBlock() {
  const { data, error } = useSWR<{ trend: Array<{ week: string; listed: number; claims: number; completed: number }>; byCategory: Array<{ category: string; count: number }> }>(
    "/api/analytics/dashboard?days=28"
  );

  const { data: forecastData } = useSWR<{
    forecast: { sufficient: boolean; message?: string; byLocality: Array<{ district: string; claims: number }>; confidence: string; source: string; note?: string };
  }>("/api/ai/forecast");

  async function exportCsv() {
    window.location.href = "/api/analytics/export?type=listings";
    toast.success("Report download started.");
  }

  if (error) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Charts unavailable</AlertTitle>
        <AlertDescription>Analytics data could not be loaded. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.location.reload()}>Retry</Button></AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data ? (
        <>
          <TrendBarChart
            data={data.trend}
            keys={[
              { key: "listed", label: "Listings created" },
              { key: "claims", label: "Claims received" },
              { key: "completed", label: "Completed" },
            ]}
            title="Your rescue activity"
            description="Last 4 weeks — listings, claims and completed donations."
          />
          <CategoryPieChart
            data={data.byCategory.length ? data.byCategory : [{ category: "No data", count: 1 }]}
            title="Listings by category"
            description="Distribution of your listings across food categories."
          />
        </>
      ) : (
        <>
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </>
      )}

      {/* Demand forecast */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Demand insights
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estimate
            </span>
          </CardTitle>
          <CardDescription>
            {forecastData?.forecast.sufficient
              ? `Patterns from platform claims (confidence: ${forecastData.forecast.confidence}). ${forecastData.forecast.note ?? ""}`
              : "Forecasting needs more platform history — nothing is invented."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forecastData?.forecast.sufficient ? (
            <div className="flex flex-wrap gap-2">
              {forecastData.forecast.byLocality.slice(0, 5).map((d) => (
                <span key={d.district} className="rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
                  {d.district}: {d.claims} claims
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{forecastData?.forecast.message ?? "Not enough data yet."}</p>
          )}
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Download donation report (CSV)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
