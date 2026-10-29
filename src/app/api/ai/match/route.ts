import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { scoreNGOMatches } from "@/lib/ai";

/**
 * GET /api/ai/match?listingId=... — recommend suitable NGOs for a listing.
 * Transparent, explainable scoring; recommendations never auto-assign food and
 * never override eligibility or safety requirements.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("DONOR", "ADMIN");
    const listingId = req.nextUrl.searchParams.get("listingId");
    if (!listingId) return fail("listingId is required.", 422);

    const listing = await db.foodListing.findUnique({ where: { id: listingId } });
    if (!listing) return fail("Listing not found.", 404);

    const ngos = await db.user.findMany({
      where: { role: "NGO", verificationStatus: { in: ["VERIFIED", "PENDING"] } },
      select: {
        id: true, displayName: true, organizationName: true, district: true, locality: true,
        verificationStatus: true, preferredCategories: true, capacityPerPickup: true,
      },
      take: 50,
    });

    const result = scoreNGOMatches({
      listing: {
        district: listing.district,
        locality: listing.pickupLocality,
        category: listing.category,
        dietary: listing.dietary,
        remainingQuantity: listing.remainingQuantity,
        unit: listing.unit,
        pickupDeadline: listing.pickupDeadline,
      },
      ngos,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
