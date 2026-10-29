import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { expireOverdueListings } from "@/lib/listing-utils";

/** GET /api/dashboard/ngo/overview — NGO stats for the overview page. */
export async function GET() {
  try {
    const user = await requireRole("NGO", "ADMIN");
    await expireOverdueListings();

    const ngoDistrict = user.district ?? "";

    const claimsRaw = await db.foodClaim.findMany({
      where: { ngoId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true, title: true, unit: true, district: true, pickupLocality: true, category: true,
            pickupDeadline: true, images: true, status: true, pickupStartAt: true, pickupAddress: true, contactInstructions: true,
            donor: { select: { id: true, organizationName: true, displayName: true, phone: true } },
          },
        },
      },
    });
    const claimCategory = new Map(claimsRaw.map((c) => [c.id, c.listing.category]));

    const [nearbyListings] = await Promise.all([
      db.foodListing.count({
        where: {
          status: { in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
          pickupDeadline: { gt: new Date() },
          safetyReview: "DONOR_CONFIRMED",
          ...(ngoDistrict ? { district: ngoDistrict } : {}),
        },
      }),
    ]);
    const claims = claimsRaw;

    const completed = claims.filter((c) => ["COMPLETED", "PICKED_UP", "DELIVERED"].includes(c.status));
    const quantityReceived = completed.reduce((s, c) => s + (c.approvedQuantity ?? 0), 0);

    const trend = [0, 1, 2, 3].map((i) => {
      const from = Date.now() - (4 - i) * 7 * 86400000;
      const to = Date.now() - (3 - i) * 7 * 86400000;
      return {
        week: new Date(to).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        claims: claims.filter((c) => +new Date(c.createdAt) >= from && +new Date(c.createdAt) < to).length,
        received: claims
          .filter((c) => +new Date(c.createdAt) >= from && +new Date(c.createdAt) < to && ["COMPLETED", "PICKED_UP", "DELIVERED"].includes(c.status))
          .reduce((s, c) => s + (c.approvedQuantity ?? 0), 0),
      };
    });
    const byCategory = Object.entries(
      claims.reduce<Record<string, number>>((acc, c) => {
        const cat = claimCategory.get(c.id) ?? "OTHER";
        acc[cat] = (acc[cat] ?? 0) + 1;
        return acc;
      }, {})
    );

    return ok({
      claims,
      stats: {
        nearbyListings,
        pendingClaims: claims.filter((c) => c.status === "REQUESTED").length,
        confirmedPickups: claims.filter((c) => ["ACCEPTED", "READY_FOR_PICKUP"].includes(c.status)).length,
        completedCollections: completed.length,
        quantityReceived,
        peopleServed: claims.filter((c) => c.status === "COMPLETED").reduce((s, c) => s + (c.peopleToServe ?? 0), 0),
        unit: "units",
      },
      trend,
      byCategory: byCategory.map(([category, count]) => ({ category, count })),
    });
  } catch (err) {
    return handleError(err);
  }
}
