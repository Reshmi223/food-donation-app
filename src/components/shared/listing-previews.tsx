"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, type PublicListing } from "@/components/shared/listing-card";

export function ListingPreviews() {
  const { data, isLoading } = useSWR<{ listings: PublicListing[] }>(
    "/api/listings?pageSize=3&safetyConfirmed=true"
  );

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
      </div>
    );
  }

  const listings = data?.listings ?? [];
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">No food is available for pickup right now</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New listings appear here the moment donors publish them.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      <div className="mt-7 text-center">
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/explore">
            Explore all listings <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </>
  );
}
