"use client";

import Link from "next/link";
import { Clock, MapPin, UtensilsCrossed, Users, AlertTriangle, Leaf, Drumstick } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { FoodImage } from "@/components/shared/food-image";
import { labelFor, FOOD_CATEGORIES, QUANTITY_UNITS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  category: string;
  dietary: string;
  quantity: number;
  remainingQuantity: number;
  unit: string;
  servings?: number | null;
  preparedAt: string;
  pickupStartAt: string;
  pickupDeadline: string;
  pickupLocality: string;
  district: string;
  storage: string;
  allergens?: string | null;
  images?: string | null;
  status: string;
  safetyReview: string;
  donorVerified: boolean;
  donorOrganization?: string | null;
  hoursLeft: number;
};

export function ListingCard({ listing, className }: { listing: PublicListing; className?: string }) {
  const missingSafety = listing.safetyReview !== "DONOR_CONFIRMED";
  return (
    <Card className={cn("group flex h-full flex-col overflow-hidden py-0 transition-all hover:shadow-md", className)}>
      <CardHeader className="p-0">
        <div className="relative h-40 overflow-hidden bg-[oklch(0.954_0.0149_158.25)]">
          <FoodImage
            category={listing.category}
            imageId={listing.images ? JSON.parse(listing.images)[0] : undefined}
            alt={listing.title}
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <ListingStatusBadge status={listing.status} />
            {listing.dietary === "VEGETARIAN" || listing.dietary === "VEGAN" ? (
              <Badge className="border-transparent bg-card/90 text-primary" variant="outline">
                <Leaf className="h-3 w-3" aria-hidden /> {listing.dietary === "VEGAN" ? "Vegan" : "Veg"}
              </Badge>
            ) : listing.dietary === "NON_VEGETARIAN" ? (
              <Badge className="border-transparent bg-card/90 text-[oklch(0.55_0.19_25)]" variant="outline">
                <Drumstick className="h-3 w-3" aria-hidden /> Non-veg
              </Badge>
            ) : null}
          </div>
          {listing.hoursLeft <= 4 && listing.hoursLeft > 0 && (
            <Badge className="absolute right-2.5 top-2.5 gap-1 border-transparent bg-destructive text-white">
              <AlertTriangle className="h-3 w-3" aria-hidden /> Ends in {listing.hoursLeft}h
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="line-clamp-1 font-semibold leading-snug">{listing.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {labelFor(FOOD_CATEGORIES, listing.category)} · {listing.donorOrganization ?? "Verified donor"}
            {listing.donorVerified && " ✓"}
          </p>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
        <ul className="mt-auto grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <UtensilsCrossed className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span>
              {listing.remainingQuantity} {labelFor(QUANTITY_UNITS, listing.unit)} left
            </span>
          </li>
          {listing.servings ? (
            <li className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>~{listing.servings} servings</span>
            </li>
          ) : (
            <li className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>Pickup {formatRelativeTime(listing.pickupStartAt)}</span>
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="truncate">{listing.pickupLocality}, {listing.district}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span>Deadline {formatRelativeTime(listing.pickupDeadline)}</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="gap-2 border-t bg-card p-3">
        <Button asChild size="sm" className="flex-1">
          <Link href={`/explore/${listing.id}`}>View & Claim</Link>
        </Button>
        {missingSafety && (
          <Badge variant="outline" className="border-dashed text-[11px] text-muted-foreground">
            Safety info incomplete
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
