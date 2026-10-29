// Server-side helpers shared by listing/claim routes.
import { db } from "@/lib/db";

export type ListingWithDonor = Awaited<ReturnType<typeof db.foodListing.findFirst>> & { donor?: { organizationName: string | null; displayName: string; verificationStatus: string } | null };

/** Shape a listing for public exposure — strips protected pickup address and contact instructions. */
export function publicListingShape(l: NonNullable<ListingWithDonor>) {
  const hoursLeft = Math.max(0, Math.round((new Date(l.pickupDeadline).getTime() - Date.now()) / 3600000));
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    category: l.category,
    dietary: l.dietary,
    quantity: l.quantity,
    remainingQuantity: l.remainingQuantity,
    unit: l.unit,
    servings: l.servings,
    preparedAt: l.preparedAt,
    pickupStartAt: l.pickupStartAt,
    pickupDeadline: l.pickupDeadline,
    // Locality/district only — exact address & contact instructions stay protected.
    pickupLocality: l.pickupLocality,
    district: l.district,
    storage: l.storage,
    allergens: l.allergens,
    images: l.images,
    status: l.status,
    safetyReview: l.safetyReview,
    donorVerified: l.donor?.verificationStatus === "VERIFIED",
    donorOrganization: l.donor?.organizationName ?? l.donor?.displayName ?? null,
    hoursLeft,
  };
}

/** Shape a listing for its owner (donor) — full detail. */
export function ownerListingShape(l: NonNullable<ListingWithDonor>) {
  return {
    ...l,
    donorVerified: l.donor?.verificationStatus === "VERIFIED",
    hoursLeft: Math.max(0, Math.round((new Date(l.pickupDeadline).getTime() - Date.now()) / 3600000)),
  };
}

export function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Auto-expire listings whose pickup deadline has passed and that are still
 * publicly available. Restores nothing (nothing was reserved if it never got
 * claimed). Returns count of newly expired listings.
 */
export async function expireOverdueListings(): Promise<number> {
  const res = await db.foodListing.updateMany({
    where: {
      status: { in: ["AVAILABLE", "PARTIALLY_RESERVED", "DRAFT"] },
      pickupDeadline: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return res.count;
}
