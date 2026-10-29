"use client";

import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Download, History, PackageCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ClaimStatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatRelativeTime } from "@/lib/api-client";
import { labelFor, FOOD_CATEGORIES } from "@/lib/constants";

type Claim = {
  id: string; status: string; requestedQuantity: number; approvedQuantity: number | null;
  peopleToServe: number | null; createdAt: string; updatedAt: string;
  listing: { id: string; title: string; unit: string; category: string; district: string };
};

export default function NgoHistoryPage() {
  const { data, isLoading } = useSWR<{ claims: Claim[] }>("/api/claims");
  const claims = data?.claims ?? [];
  const received = claims.filter((c) => ["COMPLETED", "PICKED_UP", "DELIVERED"].includes(c.status));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collection history</h1>
          <p className="text-sm text-muted-foreground">
            {received.length} collection{received.length === 1 ? "" : "s"} ·{" "}
            {received.reduce((s, c) => s + (c.approvedQuantity ?? 0), 0)} units received ·{" "}
            {received.reduce((s, c) => s + (c.peopleToServe ?? 0), 0)} people served
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => { window.location.href = "/api/analytics/export?type=claims"; toast.success("Report download started."); }}>
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>

      {claims.length === 0 ? (
        <EmptyState icon={History} title="No collections yet" description="Your collection history builds as you claim and complete rescues." actionLabel="Browse food" href="/dashboard/ngo/browse" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Food</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">People served</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Collected</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                  <td className="max-w-56 px-4 py-3">
                    <Link href={`/explore/${c.listing.id}`} className="truncate font-medium hover:underline">{c.listing.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{labelFor(FOOD_CATEGORIES, c.listing.category)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.listing.district}</td>
                  <td className="px-4 py-3 tabular-nums">{c.approvedQuantity ?? c.requestedQuantity} {c.listing.unit}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.peopleToServe ? <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" aria-hidden /> {c.peopleToServe}</span> : "—"}
                  </td>
                  <td className="px-4 py-3"><ClaimStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
