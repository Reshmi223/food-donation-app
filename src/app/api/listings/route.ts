import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listingSchema } from "@/lib/validations";
import { handleError, ok } from "@/lib/api";
import { publicListingShape, expireOverdueListings } from "@/lib/listing-utils";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/listings — public listing discovery with validated filters & sorting.
 * Only public fields are returned; exact pickup addresses stay protected.
 */
export async function GET(req: NextRequest) {
  try {
    await expireOverdueListings();
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const categories = sp.get("categories")?.split(",").filter(Boolean) ?? [];
    const dietary = sp.get("dietary")?.split(",").filter(Boolean) ?? [];
    const districts = sp.get("districts")?.split(",").filter(Boolean) ?? [];
    const minQuantity = Number(sp.get("minQuantity")) || 0;
    const maxHoursToDeadline = Number(sp.get("maxHoursToDeadline")) || 0;
    const pickupWindow = sp.get("pickupWindow"); // "today" | "tomorrow" | "week"
    const verifiedOnly = sp.get("verifiedOnly") === "true";
    const safetyConfirmed = sp.get("safetyConfirmed") !== "false"; // default on
    const sort = sp.get("sort") ?? "newest"; // newest | deadline | quantity
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(24, Math.max(3, Number(sp.get("pageSize")) || 12));

    const where: Prisma.FoodListingWhereInput = {
      status: { in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
      pickupDeadline: { gt: new Date() },
    };
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { pickupLocality: { contains: q } },
        { district: { contains: q } },
      ];
    }
    if (categories.length) where.category = { in: categories };
    if (dietary.length) where.dietary = { in: dietary };
    if (districts.length) where.district = { in: districts };
    if (minQuantity > 0) where.remainingQuantity = { gte: minQuantity };
    if (maxHoursToDeadline > 0) {
      where.pickupDeadline = { gt: new Date(), lte: new Date(Date.now() + maxHoursToDeadline * 3600000) };
    }
    if (pickupWindow === "today") {
      const eod = new Date(); eod.setHours(23, 59, 59, 999);
      where.pickupDeadline = { gt: new Date(), lte: eod };
    } else if (pickupWindow === "tomorrow") {
      const eod = new Date(); eod.setDate(eod.getDate() + 1); eod.setHours(23, 59, 59, 999);
      where.pickupDeadline = { gt: new Date(), lte: eod };
    } else if (pickupWindow === "week") {
      where.pickupDeadline = { gt: new Date(), lte: new Date(Date.now() + 7 * 86400000) };
    }
    if (safetyConfirmed) where.safetyReview = "DONOR_CONFIRMED";

    const orderBy: Prisma.FoodListingOrderByWithRelationInput[] =
      sort === "deadline" ? [{ pickupDeadline: "asc" }]
      : sort === "quantity" ? [{ remainingQuantity: "desc" }]
      : [{ createdAt: "desc" }];

    const [total, listings] = await Promise.all([
      db.foodListing.count({ where }),
      db.foodListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { donor: { select: { organizationName: true, displayName: true, verificationStatus: true } } },
      }),
    ]);

    let shaped = listings.map(publicListingShape);
    if (verifiedOnly) shaped = shaped.filter((l) => l.donorVerified);

    return ok({ listings: shaped, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/listings — donor creates a listing (DRAFT or AVAILABLE). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("DONOR");
    if (user.verificationStatus === "SUSPENDED") return handleError(new Error("suspended"));
    const data = listingSchema.parse(await req.json());

    // Safety gate: a listing can only go live when the donor confirms details.
    const safetyReview = data.donorConfirmed ? "DONOR_CONFIRMED" : "PENDING";

    const listing = await db.foodListing.create({
      data: {
        donorId: user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        dietary: data.dietary,
        quantity: data.quantity,
        unit: data.unit,
        remainingQuantity: data.quantity,
        servings: data.servings ?? null,
        preparedAt: new Date(data.preparedAt),
        pickupStartAt: new Date(data.pickupStartAt),
        pickupDeadline: new Date(data.pickupDeadline),
        storage: data.storage,
        allergens: JSON.stringify(data.allergens),
        packaging: data.packaging ?? null,
        pickupAddress: data.pickupAddress,
        pickupLocality: data.pickupLocality,
        district: data.district,
        state: data.state ?? "Tamil Nadu",
        contactInstructions: data.contactInstructions ?? null,
        images: JSON.stringify(data.images ?? []),
        notes: data.notes ?? null,
        status: data.donorConfirmed ? data.status : "DRAFT",
        safetyReview,
        donorConfirmed: data.donorConfirmed,
      },
    });

    await audit({
      actorId: user.id,
      action: data.status === "AVAILABLE" ? "LISTING_PUBLISHED" : "LISTING_DRAFT_CREATED",
      targetType: "FOOD_LISTING",
      targetId: listing.id,
    });

    // Notify verified NGOs in the same district about the new listing.
    if (listing.status === "AVAILABLE") {
      const ngos = await db.user.findMany({
        where: {
          role: "NGO",
          verificationStatus: "VERIFIED",
          district: listing.district,
        },
        select: { id: true },
      });
      await Promise.allSettled(
        ngos.map((ngo) =>
          notify({
            recipientId: ngo.id,
            type: "NEW_MATCHING_LISTING",
            title: "New food listing in your district",
            message: `"${listing.title}" is available for pickup in ${listing.district}.`,
            linkUrl: `/dashboard/ngo/browse?listing=${listing.id}`,
          })
        )
      );
    }

    return ok({ listing: { id: listing.id, status: listing.status, safetyReview: listing.safetyReview } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
