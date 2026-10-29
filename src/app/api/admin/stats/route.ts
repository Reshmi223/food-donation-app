import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { expireOverdueListings } from "@/lib/listing-utils";

/** GET /api/admin/stats — administrator overview metrics (privileged). */
export async function GET() {
  try {
    await requireRole("ADMIN");
    await expireOverdueListings();

    const [
      totalUsers, pendingVerifications, activeListings, openClaims, completedRescues,
      openReports, flaggedListings, suspendedUsers, pendingMessages,
    ] = await Promise.all([
      db.user.count(),
      db.organizationVerification.count({ where: { reviewStatus: "PENDING" } }),
      db.foodListing.count({ where: { status: { in: ["AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED"] }, pickupDeadline: { gt: new Date() } } }),
      db.foodClaim.count({ where: { status: { in: ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP", "DISPUTED"] } } }),
      db.foodClaim.count({ where: { status: "COMPLETED" } }),
      db.safetyReport.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
      db.foodListing.count({ where: { status: "FLAGGED" } }),
      db.user.count({ where: { verificationStatus: "SUSPENDED" } }),
      db.contactMessage.count({ where: { status: "NEW" } }),
    ]);

    // 14-day listing/claim trend
    const since = new Date(Date.now() - 14 * 86400000);
    const [recentListings, recentClaims] = await Promise.all([
      db.foodListing.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
      db.foodClaim.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
    ]);
    const trend = Array.from({ length: 14 }, (_, i) => {
      const day = new Date(Date.now() - (13 - i) * 86400000);
      const key = day.toDateString();
      return {
        day: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        listings: recentListings.filter((l) => new Date(l.createdAt).toDateString() === key).length,
        claims: recentClaims.filter((c) => new Date(c.createdAt).toDateString() === key).length,
      };
    });

    const claimsTotal = await db.foodClaim.count();
    const acceptedTotal = await db.foodClaim.count({ where: { status: { in: ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP", "DELIVERED", "COMPLETED"] } } });

    return ok({
      stats: {
        totalUsers, pendingVerifications, activeListings, openClaims, completedRescues,
        openReports, flaggedListings, suspendedUsers, pendingMessages,
        claimAcceptanceRate: claimsTotal ? Math.round((acceptedTotal / claimsTotal) * 100) : 0,
      },
      trend,
    });
  } catch (err) {
    return handleError(err);
  }
}
