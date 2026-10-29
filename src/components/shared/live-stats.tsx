"use client";

import useSWR from "swr";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_MODE } from "@/lib/constants";

type Stats = {
  activeListings: number;
  mealsRescued: number;
  completedDonations: number;
  activeDonors: number;
  verifiedNgos: number;
  volunteers: number;
  communityMembers: number;
};

export function LiveStats() {
  const { data, isLoading } = useSWR<{ stats: Stats }>("/api/analytics/public");

  const items = [
    { value: data?.stats.mealsRescued ?? 0, label: "Meals rescued" },
    { value: data?.stats.activeListings ?? 0, label: "Food available now" },
    { value: data?.stats.completedDonations ?? 0, label: "Completed donations" },
    { value: data?.stats.verifiedNgos ?? 0, label: "Verified NGOs" },
    { value: data?.stats.activeDonors ?? 0, label: "Active donors" },
    { value: data?.stats.volunteers ?? 0, label: "Volunteers" },
  ];

  return (
    <section aria-label="Live platform statistics" className="mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-3 lg:grid-cols-6 sm:p-6">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            {isLoading ? (
              <Skeleton className="mx-auto h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-primary sm:text-3xl">
                {item.value.toLocaleString("en-IN")}
              </p>
            )}
            <p className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      {DEMO_MODE && !isLoading && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" aria-hidden />
          Live from the database — sample demo data in this environment.
        </p>
      )}
    </section>
  );
}
