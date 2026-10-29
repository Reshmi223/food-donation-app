import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { expireOverdueListings } from "@/lib/listing-utils";
import { CLAIM_ACCEPTANCE_RATE_WINDOW_DAYS } from "@/lib/constants";

/** GET /api/dashboard/donor/overview — donor stats, listings and claims in one payload. */
export async function GET() {
  try {
    const user = await requireRole("DONOR", "ADMIN");
    await expireOverdueListings();

    const since = new Date(Date.now() - CLAIM_ACCEPTANCE_RATE_WINDOW_DAYS * 86400000);

    const [listings, claims, totalListings] = await Promise.all([
      db.foodListing.findMany({
        where: user.role === "DONOR" ? { donorId: user.id } : {},
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, status: true, quantity: true, remainingQuantity: true,
          unit: true, pickupDeadline: true, category: true, createdAt: true,
        },
      }),
      db.foodClaim.findMany({
        where: user.role === "DONOR" ? { listing: { donorId: user.id } } : {},
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          listing: { select: { id: true, title: true, unit: true, district: true } },
          ngo: { select: { displayName: true, organizationName: true, verificationStatus: true } },
        },
      }),
      db.foodListing.count({ where: user.role === "DONOR" ? { donorId: user.id } : {} }),
    ]);

    const activeListings = listings.filter(
      (l) => ["AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED"].includes(l.status) && new Date(l.pickupDeadline) > new Date()
    );
    const availableQuantity = activeListings.reduce((s, l) => s + l.remainingQuantity, 0);
    const completed = claims.filter((c) => c.status === "COMPLETED");
    const totalRescued = completed.reduce((s, c) => s + (c.approvedQuantity ?? 0), 0);
    const recentClaims = claims.filter((c) => new Date(c.createdAt) >= since);
    const acceptanceRate = recentClaims.length
      ? Math.round((recentClaims.filter((c) => !["REQUESTED", "REJECTED", "CANCELLED"].includes(c.status)).length / recentClaims.length) * 100)
      : 0;

    // Aggregations for charts
    const trend = [0, 1, 2, 3].map((i) => {
      const from = Date.now() - (4 - i) * 7 * 86400000;
      const to = Date.now() - (3 - i) * 7 * 86400000;
      return {
        week: new Date(to).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        listed: listings.filter((l) => +new Date(l.createdAt) >= from && +new Date(l.createdAt) < to).length,
        claims: claims.filter((c) => +new Date(c.createdAt) >= from && +new Date(c.createdAt) < to).length,
        completed: claims.filter((c) => +new Date(c.createdAt) >= from && +new Date(c.createdAt) < to && c.status === "COMPLETED").length,
      };
    });
    const byCategory = Object.entries(
      listings.reduce<Record<string, number>>((acc, l) => {
        acc[l.category] = (acc[l.category] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([category, count]) => ({ category, count }));

    return ok({
      claims,
      listings,
      stats: {
        activeListings: activeListings.length,
        availableQuantity: Math.round(availableQuantity * 10) / 10,
        pendingClaims: claims.filter((c) => c.status === "REQUESTED").length,
        completedDonations: completed.length,
        totalRescued: Math.round(totalRescued * 10) / 10,
        acceptanceRate,
        unit: listings[0]?.unit ?? "MEALS",
        totalListings,
      },
      trend,
      byCategory,
    });
  } catch (err) {
    return handleError(err);
  }
}
