import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { expireOverdueListings } from "@/lib/listing-utils";

/**
 * GET /api/analytics/public — live platform statistics for the home page.
 * Metrics are computed from actual database records only. When no data exists,
 * zeros are shown (never fabricated numbers).
 *
 * Metric definitions (documented for transparency):
 * - mealsRescued: sum of approved quantities of COMPLETED claims (unit MEALS)
 *   plus kg-to-meals conversion for KG units using a documented estimate.
 * - foodRescuedKg: kg-completed + meals→kg for MEALS units.
 * - completedDonations: claims with status COMPLETED.
 * - activeDonors: distinct donors with ≥1 listing published.
 * - verifiedNgos: NGOs with VERIFIED status.
 * - activeListings: listings currently AVAILABLE / PARTIALLY_RESERVED.
 */
export async function GET() {
  try {
    await expireOverdueListings();

    const completedClaims = await db.foodClaim.findMany({
      where: { status: "COMPLETED" },
      select: { approvedQuantity: true, listing: { select: { unit: true } } },
    });

    const MEALS_PER_KG = 2; // documented conversion estimate, configurable via settings
    let mealsRescued = 0;
    let kgRescued = 0;
    for (const c of completedClaims) {
      const qty = c.approvedQuantity ?? 0;
      if (c.listing.unit === "KG") {
        kgRescued += qty;
        mealsRescued += qty * MEALS_PER_KG;
      } else if (c.listing.unit === "LITRES") {
        kgRescued += qty;
        mealsRescued += qty * MEALS_PER_KG;
      } else {
        mealsRescued += qty; // MEALS, PLATES, BOXES counted directly
        kgRescued += qty / MEALS_PER_KG;
      }
    }

    const [activeListings, activeDonors, verifiedNgos, totalUsers, completedDonations] = await Promise.all([
      db.foodListing.count({ where: { status: { in: ["AVAILABLE", "PARTIALLY_RESERVED"] }, pickupDeadline: { gt: new Date() } } }),
      db.foodListing.groupBy({ by: ["donorId"], where: { status: { in: ["AVAILABLE", "COMPLETED", "PICKED_UP", "FULLY_RESERVED", "PARTIALLY_RESERVED"] } } }),
      db.user.count({ where: { role: "NGO", verificationStatus: "VERIFIED" } }),
      db.user.count(),
      db.foodClaim.count({ where: { status: "COMPLETED" } }),
    ]);

    return ok({
      stats: {
        activeListings,
        mealsRescued: Math.round(mealsRescued),
        foodRescuedKg: Math.round(kgRescued),
        completedDonations,
        activeDonors: activeDonors.length,
        verifiedNgos,
        volunteers: await db.user.count({ where: { role: "VOLUNTEER" } }),
        communityMembers: totalUsers,
      },
      definitions: {
        mealsRescued: "Approved quantities of completed claims (kg converted at 2 meals/kg — estimate)",
        foodRescuedKg: "Completed rescue volume in kg (meals converted at 0.5 kg/meal — estimate)",
        activeDonors: "Donor organizations with at least one published listing",
        verifiedNgos: "NGOs that passed platform verification",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
