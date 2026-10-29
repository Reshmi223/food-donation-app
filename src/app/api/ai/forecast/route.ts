import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { forecastDemand, recommendSurplusQuantity } from "@/lib/ai";

/**
 * GET /api/ai/forecast — demand forecasting + surplus planning suggestions.
 * Shows "Not enough data yet" when history is insufficient. Never fabricates.
 */
export async function GET() {
  try {
    const user = await requireRole("ADMIN", "DONOR", "NGO");

    const claims = await db.foodClaim.findMany({
      select: {
        createdAt: true,
        status: true,
        approvedQuantity: true,
        requestedQuantity: true,
        listing: { select: { district: true, category: true, unit: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const forecast = await forecastDemand({
      claims: claims.map((c) => ({
        district: c.listing.district,
        category: c.listing.category,
        createdAt: c.createdAt,
        status: c.status,
        quantity: c.approvedQuantity ?? c.requestedQuantity,
      })),
    });

    let surplus: Awaited<ReturnType<typeof recommendSurplusQuantity>> = null;
    if (user.role === "DONOR") {
      const history = await db.foodListing.findMany({
        where: { donorId: user.id, status: { in: ["COMPLETED", "PICKED_UP", "EXPIRED", "WITHDRAWN", "AVAILABLE", "FULLY_RESERVED", "PARTIALLY_RESERVED"] } },
        select: { category: true, quantity: true, unit: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      surplus = await recommendSurplusQuantity({
        history: history.map((h) => ({
          category: h.category,
          quantity: h.quantity,
          unit: h.unit,
          status: h.status,
          month: h.createdAt.toISOString().slice(0, 7),
        })),
      });
    }

    return ok({ forecast, surplus });
  } catch (err) {
    return handleError(err);
  }
}
