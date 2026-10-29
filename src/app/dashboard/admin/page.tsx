"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  Users, FileCheck2, UtensilsCrossed, ClipboardList, CheckCircle2, Flag,
  ShieldAlert, Ban, TrendingUp, Mail, ArrowRight, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { TrendLineChart } from "@/components/dashboard/charts";

type AdminStats = {
  stats: {
    totalUsers: number; pendingVerifications: number; activeListings: number; openClaims: number;
    completedRescues: number; openReports: number; flaggedListings: number; suspendedUsers: number;
    pendingMessages: number; claimAcceptanceRate: number;
  };
  trend: Array<{ day: string; listings: number; claims: number }>;
};

export default function AdminOverviewPage() {
  const { data, isLoading } = useSWR<AdminStats>("/api/admin/stats");

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration overview</h1>
          <p className="text-sm text-muted-foreground">Platform health, moderation queues and rescue trends.</p>
        </div>
        <Button asChild variant="outline" className="gap-1.5">
          <a href="/api/analytics/export?type=audit" download>
            <Download className="h-4 w-4" aria-hidden /> Export audit CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Registered users" value={s.totalUsers} tone="primary" />
        <StatCard icon={FileCheck2} label="Pending verifications" value={s.pendingVerifications} tone={s.pendingVerifications > 0 ? "warning" : "default"} />
        <StatCard icon={UtensilsCrossed} label="Active listings" value={s.activeListings} />
        <StatCard icon={ClipboardList} label="Open claims" value={s.openClaims} />
        <StatCard icon={CheckCircle2} label="Completed rescues" value={s.completedRescues} />
        <StatCard icon={Flag} label="Open safety reports" value={s.openReports} tone={s.openReports > 0 ? "danger" : "default"} />
        <StatCard icon={ShieldAlert} label="Flagged listings" value={s.flaggedListings} tone={s.flaggedListings > 0 ? "warning" : "default"} />
        <StatCard icon={Ban} label="Suspended accounts" value={s.suspendedUsers} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Listing & claim trend
            </CardTitle>
            <CardDescription>Last 14 days across the platform · claim acceptance rate: {s.claimAcceptanceRate}%</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <TrendLineChart
              data={data.trend}
              keys={[{ key: "listings", label: "Listings" }, { key: "claims", label: "Claims" }]}
              title=""
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Action queues</CardTitle>
            <CardDescription>Items that may need your attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { href: "/dashboard/admin/verifications", label: "Review NGO verifications", count: s.pendingVerifications, icon: FileCheck2 },
              { href: "/dashboard/admin/reports", label: "Resolve safety reports", count: s.openReports, icon: Flag },
              { href: "/dashboard/admin/listings?status=FLAGGED", label: "Moderate flagged listings", count: s.flaggedListings, icon: ShieldAlert },
              { href: "/dashboard/admin/settings", label: "Support messages", count: s.pendingMessages, icon: Mail },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex items-center gap-2 font-medium">
                  <q.icon className="h-4 w-4 text-primary" aria-hidden /> {q.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{q.count}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
