"use client";

import useSWR from "swr";
import { Download, Info } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendLineChart, DistrictBarChart, CategoryPieChart } from "@/components/dashboard/charts";
import { toast } from "sonner";
import { labelFor, FOOD_CATEGORIES } from "@/lib/constants";

type DashData = {
  role: string;
  trend: Array<{ week: string; listed: number; claims: number }>;
  byDistrict: Array<{ district: string; count: number }>;
};

type AdminListing = { id: string; category: string; status: string };

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useSWR<DashData>("/api/analytics/dashboard?days=28");
  const { data: listingData } = useSWR<{ listings: AdminListing[] }>("/api/admin/listings");

  const listings = listingData?.listings ?? [];

  const byCategory = Object.entries(
    listings.reduce<Record<string, number>>((acc, l) => {
      acc[l.category] = (acc[l.category] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category: labelFor(FOOD_CATEGORIES, category), count }));

  const statusCounts = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const outcomeData = [
    { stage: "Completed", count: statusCounts["COMPLETED"] ?? 0 },
    { stage: "In progress", count: (statusCounts["AVAILABLE"] ?? 0) + (statusCounts["PARTIALLY_RESERVED"] ?? 0) + (statusCounts["FULLY_RESERVED"] ?? 0) },
    { stage: "Expired", count: statusCounts["EXPIRED"] ?? 0 },
    { stage: "Withdrawn", count: statusCounts["WITHDRAWN"] ?? 0 },
    { stage: "Flagged", count: statusCounts["FLAGGED"] ?? 0 },
    { stage: "Picked up", count: statusCounts["PICKED_UP"] ?? 0 },
  ];

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impact analytics</h1>
          <p className="text-sm text-muted-foreground">Platform-wide rescue metrics computed from real records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => { window.location.href = "/api/analytics/export?type=listings"; toast.success("Listings CSV downloading."); }}>
            <Download className="h-4 w-4" aria-hidden /> Listings
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { window.location.href = "/api/analytics/export?type=claims"; toast.success("Claims CSV downloading."); }}>
            <Download className="h-4 w-4" aria-hidden /> Claims
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { window.location.href = "/api/analytics/export?type=audit"; toast.success("Audit CSV downloading."); }}>
            <Download className="h-4 w-4" aria-hidden /> Audit
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Metric definitions</AlertTitle>
        <AlertDescription className="text-xs">
          <strong>Listed</strong>: food listings created. <strong>Reserved</strong>: approved claim quantities held for pickup.{" "}
          <strong>Collected</strong>: picked up by recipients. <strong>Completed</strong>: confirmed distributed. Environmental
          benefit estimates (e.g. CO₂ avoided) are shown only when an administrator enables a documented conversion
          methodology in settings — never invented.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendLineChart
          data={data.trend}
          keys={[{ key: "listed", label: "Listings" }, { key: "claims", label: "Claims" }]}
          title="Weekly listing & claim trend"
          description="Last 4 weeks across all districts."
        />
        <DistrictBarChart
          data={data.byDistrict}
          title="Listings by district"
          description="Geographic distribution of supply (top 8)."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart
          data={byCategory.length ? byCategory : [{ category: "No data", count: 1 }]}
          title="Listings by food category"
          description="Share of listings across categories."
          nameKey="category"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Listing outcomes</CardTitle>
            <CardDescription>How listed food ends up — rescue efficiency signal.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomeData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
                <ReTooltip cursor={{ fill: "oklch(0.55 0.02 155 / 0.08)" }} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid oklch(0.9 0.01 155)" }} />
                <Bar dataKey="count" name="Listings" fill="oklch(0.4692 0.0994 158.43)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
