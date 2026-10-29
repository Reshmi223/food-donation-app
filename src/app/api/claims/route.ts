import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { claimCreateSchema } from "@/lib/validations";
import { handleError, ok, fail } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { claimStatusLabel } from "@/lib/claims";

/**
 * GET /api/claims — role-aware claim lists.
 * NGO: own outgoing claims. DONOR: incoming claims on own listings. ADMIN: all.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("NGO", "DONOR", "ADMIN", "VOLUNTEER");
    const statusFilter = req.nextUrl.searchParams.get("status");

    const base = {
      include: {
        listing: {
          select: {
            id: true, title: true, category: true, unit: true, quantity: true,
            pickupLocality: true, district: true, pickupDeadline: true,
            pickupStartAt: true, images: true, status: true,
            donor: { select: { id: true, displayName: true, organizationName: true, phone: true } },
          },
        },
        ngo: { select: { id: true, displayName: true, organizationName: true, verificationStatus: true, phone: true } },
        statusHistory: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          include: { actor: { select: { displayName: true } } },
        },
        volunteerAssignments: { select: { id: true, status: true, volunteerId: true } },
      },
      orderBy: { createdAt: "desc" as const },
    };

    let where = {};
    if (user.role === "NGO") where = { ngoId: user.id };
    else if (user.role === "DONOR") where = { listing: { donorId: user.id } };
    else if (user.role === "VOLUNTEER") {
      // Volunteers see claims they deliver
      where = { volunteerAssignments: { some: { volunteerId: user.id } } };
    }
    if (statusFilter) where = { ...where, status: statusFilter };

    const claims = await db.foodClaim.findMany({ ...base, where });
    return ok({ claims });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/claims — an eligible (verified) NGO requests a claim.
 * The REQUESTED state does not reserve inventory; reservation happens atomically
 * when the donor approves. Concurrency-safe validation prevents over-requesting.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("NGO");
    if (user.verificationStatus !== "VERIFIED") {
      return fail(
        "Your organization is not verified yet. Submit verification documents to become eligible to claim food.",
        403,
        "NOT_VERIFIED"
      );
    }

    const data = claimCreateSchema.parse(await req.json());

    // Duplicate-request guard (idempotency): an identical open request on the
    // same listing is rejected instead of double-submitting.
    const openDuplicate = await db.foodClaim.findFirst({
      where: { listingId: data.listingId, ngoId: user.id, status: { in: ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"] } },
    });
    if (openDuplicate) {
      return fail("You already have an open request on this listing.", 409, "DUPLICATE_CLAIM");
    }

    const result = await db.$transaction(async (tx) => {
      const listing = await tx.foodListing.findUnique({ where: { id: data.listingId } });
      if (!listing) throw Object.assign(new Error("Listing not found."), { status: 404 });
      if (!["AVAILABLE", "PARTIALLY_RESERVED"].includes(listing.status)) {
        throw Object.assign(new Error("This listing is no longer accepting claims."), { status: 409 });
      }
      if (new Date(listing.pickupDeadline) <= new Date()) {
        throw Object.assign(new Error("The pickup deadline for this listing has passed."), { status: 409 });
      }
      if (listing.donorId === user.id) {
        throw Object.assign(new Error("You cannot claim your own listing."), { status: 400 });
      }
      if (data.requestedQuantity > listing.remainingQuantity) {
        throw Object.assign(
          new Error(`Only ${listing.remainingQuantity} ${listing.unit} remain available.`),
          { status: 409 }
        );
      }

      const claim = await tx.foodClaim.create({
        data: {
          listingId: listing.id,
          ngoId: user.id,
          requestedQuantity: data.requestedQuantity,
          peopleToServe: data.peopleToServe ?? null,
          collectionNotes: data.collectionNotes ?? null,
          intendedPickupAt: data.intendedPickupAt ? new Date(data.intendedPickupAt) : null,
          status: "REQUESTED",
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          actorId: user.id,
          previousStatus: null,
          newStatus: "REQUESTED",
          reason: "Claim submitted",
        },
      });

      await tx.notification.create({
        data: {
          recipientId: listing.donorId,
          type: "CLAIM_SUBMITTED",
          title: "New claim request",
          message: `${user.organizationName ?? user.displayName} requested ${data.requestedQuantity} ${listing.unit} from "${listing.title}".`,
          linkUrl: "/dashboard/donor/claims",
        },
      });

      return claim;
    });

    await audit({
      actorId: user.id,
      action: "CLAIM_SUBMITTED",
      targetType: "FOOD_CLAIM",
      targetId: result.id,
      metadata: { listingId: data.listingId, requestedQuantity: data.requestedQuantity },
    });

    return ok({ claim: { id: result.id, status: result.status } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
