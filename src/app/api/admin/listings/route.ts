import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { parseJSON } from "@/lib/listing-utils";

/** GET /api/admin/listings — all listings including flagged/withdrawn (admin view). */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const listings = await db.foodListing.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ title: { contains: q } }, { district: { contains: q } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { donor: { select: { displayName: true, organizationName: true, email: true, verificationStatus: true } } },
      take: 200,
    });
    return ok({
      listings: listings.map((l) => ({
        ...l,
        allergens: parseJSON<string[]>(l.allergens, []),
        images: parseJSON<string[]>(l.images, []),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/admin/listings — remove (FLAGGED→WITHDRAWN) or restore listings.
 * Body: { id, action: "REMOVE"|"RESTORE"|"FLAG"|"UNFLAG", reason }
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();
    const { id, action, reason } = body as { id?: string; action?: string; reason?: string };
    if (!id || !action) return fail("Provide listing id and action.", 422);
    if (!reason?.trim()) return fail("A reason is required for moderation actions.", 422);

    const listing = await db.foodListing.findUnique({ where: { id } });
    if (!listing) return fail("Listing not found.", 404);

    let nextStatus: string | undefined;
    if (action === "REMOVE") nextStatus = "WITHDRAWN";
    else if (action === "RESTORE") nextStatus = "AVAILABLE";
    else if (action === "FLAG") nextStatus = "FLAGGED";
    else if (action === "UNFLAG") nextStatus = "AVAILABLE";
    else return fail("Unknown action.", 422);

    if (["COMPLETED", "PICKED_UP", "EXPIRED"].includes(listing.status) && action !== "REMOVE") {
      return fail("Only active listings can be moderated.", 409);
    }

    // Cancel open claims when removing.
    if (action === "REMOVE") {
      const open = await db.foodClaim.findMany({
        where: { listingId: id, status: { in: ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP"] } },
      });
      for (const c of open) {
        const released = ["ACCEPTED", "READY_FOR_PICKUP"].includes(c.status) && (c.approvedQuantity ?? 0) > 0;
        await db.$transaction(async (tx) => {
          await tx.foodClaim.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
          await tx.claimStatusHistory.create({
            data: { claimId: c.id, actorId: admin.id, previousStatus: c.status, newStatus: "CANCELLED", reason: `Listing removed by admin: ${reason}` },
          });
          if (released) {
            await tx.foodListing.update({ where: { id }, data: { remainingQuantity: { increment: c.approvedQuantity! } } });
          }
          await tx.notification.create({
            data: {
              recipientId: c.ngoId,
              type: "SYSTEM",
              title: "Claim cancelled",
              message: `The listing "${listing.title}" was removed by platform moderation.`,
              linkUrl: "/dashboard/ngo/claims",
            },
          });
        });
      }
    }

    await db.foodListing.update({
      where: { id },
      data: { status: nextStatus, flaggedReason: action === "FLAG" || action === "REMOVE" ? reason : null },
    });

    await notify({
      recipientId: listing.donorId,
      type: "SYSTEM",
      title: action === "REMOVE" ? "Listing removed" : action === "FLAG" ? "Listing under review" : "Listing restored",
      message: `"${listing.title}" — ${reason}`,
      linkUrl: "/dashboard/donor",
    });

    await audit({
      actorId: admin.id,
      action: `ADMIN_LISTING_${action}`,
      targetType: "FOOD_LISTING",
      targetId: id,
      reason,
    });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
