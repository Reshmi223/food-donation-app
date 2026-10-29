import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { nlSearchFilters } from "@/lib/ai";
import { aiSearchSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { publicListingShape, expireOverdueListings } from "@/lib/listing-utils";

/**
 * POST /api/ai/search — natural-language search translated into VALIDATED
 * database filters. Generated filters are constrained server-side; generated
 * SQL or untrusted model output never executes directly.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { query } = aiSearchSchema.parse(await req.json());
    await expireOverdueListings();

    const { data: filters, source, note } = await nlSearchFilters(query);

    const where: Prisma.FoodListingWhereInput = {
      status: { in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
      pickupDeadline: { gt: new Date() },
      safetyReview: "DONOR_CONFIRMED",
    };
    if (filters.categories?.length) where.category = { in: filters.categories };
    if (filters.dietary?.length) where.dietary = { in: filters.dietary };
    if (filters.maxHoursToDeadline) {
      where.pickupDeadline = { gt: new Date(), lte: new Date(Date.now() + filters.maxHoursToDeadline * 3600000) };
    }
    // Districts and keywords form ONE inclusive OR group — a listing matches if
    // any district/keyword correlates, preventing over-filtering from AI quirks.
    const orClauses: Prisma.FoodListingWhereInput[] = [];
    for (const d of filters.districts ?? []) {
      orClauses.push({ district: { contains: d } }, { pickupLocality: { contains: d } });
    }
    for (const k of filters.keywords ?? []) {
      orClauses.push({ district: { contains: k } }, { pickupLocality: { contains: k } }, { title: { contains: k } });
    }
    if (orClauses.length) where.OR = orClauses;

    const listings = await db.foodListing.findMany({
      where,
      orderBy: { pickupDeadline: "asc" },
      take: 12,
      include: { donor: { select: { organizationName: true, displayName: true, verificationStatus: true } } },
    });

    // District-only keyword fallback: try matching a district name directly.
    let results = listings.map(publicListingShape);
    if (results.length === 0 && filters.districts?.length) {
      const alt = await db.foodListing.findMany({
        where: { ...where, district: { in: filters.districts } },
        orderBy: { pickupDeadline: "asc" },
        take: 12,
        include: { donor: { select: { organizationName: true, displayName: true, verificationStatus: true } } },
      });
      results = alt.map(publicListingShape);
    }

    return ok({ filters, source, note, listings: results });
  } catch (err) {
    return handleError(err);
  }
}
