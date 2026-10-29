import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { publicListingShape, ownerListingShape, parseJSON } from "@/lib/listing-utils";
import { audit } from "@/lib/audit";

/**
 * GET /api/listings/[id]
 * - Public: safe fields only (address/contact hidden).
 * - Donor owner / admin: full detail incl. protected fields.
 * - Verified NGO: protected fields included when they have an accepted claim.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const listing = await db.foodListing.findUnique({
      where: { id },
      include: { donor: { select: { organizationName: true, displayName: true, verificationStatus: true } } },
    });
    if (!listing) return fail("Listing not found.", 404, "NOT_FOUND");

    const session = await getSession();
    const isOwner = session?.userId === listing.donorId;
    const isAdmin = session?.role === "ADMIN";

    if (isOwner || isAdmin) {
      return ok({ listing: ownerListingShape(listing), access: "owner" });
    }

    // Verified NGO with an active claim sees pickup details.
    if (session?.role === "NGO") {
      const claim = await db.foodClaim.findFirst({
        where: {
          listingId: listing.id,
          ngoId: session.userId,
          status: { in: ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP", "COMPLETED", "DELIVERED"] },
        },
      });
      const donorProfile = await db.user.findUnique({
        where: { id: listing.donorId },
        select: { phone: true },
      });
      return ok({
        listing: {
          ...publicListingShape(listing),
          pickupAddress: claim ? listing.pickupAddress : null,
          contactInstructions: claim ? listing.contactInstructions : null,
          donorPhone: claim ? donorProfile?.phone ?? null : null,
        },
        access: claim ? "authorized" : "public",
        myClaimId: claim?.id ?? null,
      });
    }

    // Volunteer assigned to a delivery for this claim sees pickup address.
    if (session?.role === "VOLUNTEER") {
      const assignment = await db.volunteerAssignment.findFirst({
        where: {
          volunteerId: session.userId,
          claim: { listingId: listing.id, status: { in: ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"] } },
        },
        include: { claim: true },
      });
      if (assignment) {
        return ok({
          listing: {
            ...publicListingShape(listing),
            pickupAddress: listing.pickupAddress,
            contactInstructions: listing.contactInstructions,
          },
          access: "authorized",
        });
      }
    }

    return ok({ listing: publicListingShape(listing), access: "public" });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/listings/[id] — owner edits an eligible listing.
 * Editable only while DRAFT/AVAILABLE and without accepted claims.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const listing = await db.foodListing.findUnique({ where: { id } });
    if (!listing) return fail("Listing not found.", 404, "NOT_FOUND");
    if (listing.donorId !== user.id && user.role !== "ADMIN") {
      return fail("You can only edit your own listings.", 403, "FORBIDDEN");
    }
    if (!["DRAFT", "AVAILABLE"].includes(listing.status)) {
      return fail("Only draft or available listings can be edited.", 409, "NOT_EDITABLE");
    }
    const activeClaims = await db.foodClaim.count({
      where: { listingId: listing.id, status: { in: ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"] } },
    });
    if (activeClaims > 0 && user.role !== "ADMIN") {
      return fail("This listing has active claim requests — withdraw it or resolve claims first.", 409, "HAS_CLAIMS");
    }

    const body = await req.json();
    const { listingSchema } = await import("@/lib/validations");
    const data = listingSchema.parse(body);

    const updated = await db.foodListing.update({
      where: { id },
      data: {
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
        contactInstructions: data.contactInstructions ?? null,
        images: JSON.stringify(data.images ?? []),
        notes: data.notes ?? null,
        status: data.donorConfirmed ? data.status : "DRAFT",
        safetyReview: data.donorConfirmed ? "DONOR_CONFIRMED" : "PENDING",
        donorConfirmed: data.donorConfirmed,
      },
    });

    await audit({ actorId: user.id, action: "LISTING_UPDATED", targetType: "FOOD_LISTING", targetId: id });
    return ok({ listing: { id: updated.id, status: updated.status } });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * DELETE /api/listings/[id] — withdraws an eligible listing (soft: status WITHDRAWN).
 * Any reservations are released back to nothing (listing is no longer available).
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const listing = await db.foodListing.findUnique({ where: { id } });
    if (!listing) return fail("Listing not found.", 404, "NOT_FOUND");
    if (listing.donorId !== user.id && user.role !== "ADMIN") {
      return fail("You can only withdraw your own listings.", 403, "FORBIDDEN");
    }
    if (!["DRAFT", "AVAILABLE", "PARTIALLY_RESERVED"].includes(listing.status)) {
      return fail("This listing can no longer be withdrawn.", 409, "NOT_WITHDRAWABLE");
    }

    const result = await db.$transaction(async (tx) => {
      // Cancel pending requests (no inventory impact since not yet accepted)
      const cancelled = await tx.foodClaim.updateMany({
        where: { listingId: id, status: "REQUESTED" },
        data: { status: "CANCELLED", updatedAt: new Date() },
      });
      // Accepted claims are cancelled too — inventory is not restored because
      // the whole listing is gone; NGOs are notified.
      const claims = await tx.foodClaim.findMany({
        where: { listingId: id, status: { in: ["ACCEPTED", "READY_FOR_PICKUP"] } },
        select: { id: true, ngoId: true, approvedQuantity: true, status: true },
      });
      for (const c of claims) {
        await tx.foodClaim.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
        await tx.claimStatusHistory.create({
          data: {
            claimId: c.id,
            actorId: user.id,
            previousStatus: c.status,
            newStatus: "CANCELLED",
            reason: "Listing withdrawn by donor",
          },
        });
        await tx.notification.create({
          data: {
            recipientId: c.ngoId,
            type: "SYSTEM",
            title: "Listing withdrawn",
            message: `A listing you had a claim on was withdrawn by the donor.`,
            linkUrl: "/dashboard/ngo/claims",
          },
        });
      }
      await tx.foodListing.update({ where: { id }, data: { status: "WITHDRAWN" } });
      return cancelled;
    });

    await audit({
      actorId: user.id,
      action: "LISTING_WITHDRAWN",
      targetType: "FOOD_LISTING",
      targetId: id,
      metadata: { cancelledRequests: result.count },
    });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
