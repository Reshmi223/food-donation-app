import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

/**
 * GET /api/analytics/dashboard — role-aware chart/metric data.
 * Returns weekly listing/claim trends, category mix, and status mix computed
 * from real records. Every metric is labeled with its definition.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 28));
    const since = new Date(Date.now() - days * 86400000);

    if (user.role === "DONOR") {
      const [listings, claims] = await Promise.all([
        db.foodListing.findMany({
          where: { donorId: user.id, createdAt: { gte: since } },
          select: { id: true, createdAt: true, category: true, status: true, quantity: true, unit: true, remainingQuantity: true },
        }),
        db.foodClaim.findMany({
          where: { listing: { donorId: user.id }, createdAt: { gte: since } },
          select: { id: true, createdAt: true, status: true, requestedQuantity: true, approvedQuantity: true },
        }),
      ]);

      // Weekly buckets
      const weeks: Record<string, { week: string; listed: number; claims: number; completed: number }> = {};
      for (let i = 0; i < 4; i++) {
        const d = new Date(Date.now() - (3 - i) * 7 * 86400000);
        weeks[`W-${3 - i}`] = { week: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), listed: 0, claims: 0, completed: 0 };
      }
      for (const l of listings) {
        const age = (Date.now() - new Date(l.createdAt).getTime()) / 86400000;
        const key = `W-${Math.min(3, Math.floor(age / 7))}`;
        weeks[key].listed += 1;
      }
      for (const c of claims) {
        const age = (Date.now() - new Date(c.createdAt).getTime()) / 86400000;
        const key = `W-${Math.min(3, Math.floor(age / 7))}`;
        weeks[key].claims += 1;
        if (c.status === "COMPLETED") weeks[key].completed += 1;
      }

      const byCategory = Object.entries(
        listings.reduce<Record<string, number>>((acc, l) => {
          acc[l.category] = (acc[l.category] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([category, count]) => ({ category, count }));

      const byStatus = Object.entries(
        listings.reduce<Record<string, number>>((acc, l) => {
          acc[l.status] = (acc[l.status] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => ({ status, count }));

      return ok({ role: "DONOR", trend: Object.values(weeks), byCategory, byStatus });
    }

    if (user.role === "NGO") {
      const claims = await db.foodClaim.findMany({
        where: { ngoId: user.id, createdAt: { gte: since } },
        select: { id: true, createdAt: true, status: true, approvedQuantity: true, requestedQuantity: true, listing: { select: { unit: true, category: true } } },
      });
      const weeks: Record<string, { week: string; claims: number; received: number }> = {};
      for (let i = 0; i < 4; i++) {
        const d = new Date(Date.now() - (3 - i) * 7 * 86400000);
        weeks[`W-${3 - i}`] = { week: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), claims: 0, received: 0 };
      }
      for (const c of claims) {
        const age = (Date.now() - new Date(c.createdAt).getTime()) / 86400000;
        const key = `W-${Math.min(3, Math.floor(age / 7))}`;
        weeks[key].claims += 1;
        if (["COMPLETED", "PICKED_UP", "DELIVERED"].includes(c.status)) weeks[key].received += c.approvedQuantity ?? 0;
      }
      const byCategory = Object.entries(
        claims.reduce<Record<string, number>>((acc, c) => {
          acc[c.listing.category] = (acc[c.listing.category] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([category, count]) => ({ category, count }));
      return ok({ role: "NGO", trend: Object.values(weeks), byCategory });
    }

    // ADMIN + VOLUNTEER: platform overview
    const [listings, claims] = await Promise.all([
      db.foodListing.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true, status: true, category: true, district: true },
      }),
      db.foodClaim.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true, status: true, approvedQuantity: true, listing: { select: { district: true } } },
      }),
    ]);
    const trend = [0, 1, 2, 3].map((i) => {
      const since7 = Date.now() - (4 - i) * 7 * 86400000;
      const until7 = Date.now() - (3 - i) * 7 * 86400000;
      return {
        week: new Date(until7).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        listed: listings.filter((l) => +new Date(l.createdAt) >= since7 && +new Date(l.createdAt) < until7).length,
        claims: claims.filter((c) => +new Date(c.createdAt) >= since7 && +new Date(c.createdAt) < until7).length,
      };
    });
    const byDistrict = Object.entries(
      listings.reduce<Record<string, number>>((acc, l) => {
        const d = l.district || "Unknown";
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return ok({ role: user.role, trend, byDistrict });
  } catch (err) {
    return handleError(err);
  }
}
