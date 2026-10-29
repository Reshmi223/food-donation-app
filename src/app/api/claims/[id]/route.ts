import { NextRequest } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { canTransitionClaim, releasesInventory } from "@/lib/claims";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

type TransitionBody = {
  action:
    | "accept" | "reject" | "cancel" | "ready" | "picked_up" | "delivered" | "complete" | "dispute" | "assign_volunteer";
  approvedQuantity?: number;
  reason?: string;
  volunteerId?: string;
};

const ACTION_TO_STATUS: Record<TransitionBody["action"], string> = {
  accept: "ACCEPTED",
  reject: "REJECTED",
  cancel: "CANCELLED",
  ready: "READY_FOR_PICKUP",
  picked_up: "PICKED_UP",
  delivered: "DELIVERED",
  complete: "COMPLETED",
  dispute: "DISPUTED",
  assign_volunteer: "ACCEPTED", // volunteer assignment does not change claim status
};

/**
 * PATCH /api/claims/[id] — server-validated claim status transitions.
 * - Inventory is reserved/consumed ONLY through atomic conditional updates.
 * - Cancellations/rejections of reserved claims restore inventory (capped at
 *   the original listing quantity).
 * - Transitions are idempotent: repeating the same action succeeds without
 *   side effects when the claim is already in the target state.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body: TransitionBody = await req.json();
    const targetStatus = ACTION_TO_STATUS[body.action];
    if (!targetStatus) return fail("Unknown action.", 400, "BAD_ACTION");

    const claim = await db.foodClaim.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!claim) return fail("Claim not found.", 404, "NOT_FOUND");

    const isDonor = claim.listing.donorId === user.id;
    const isNgo = claim.ngoId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isDonor && !isNgo && !isAdmin) return fail("You cannot modify this claim.", 403, "FORBIDDEN");

    const actorRole = isAdmin ? "ADMIN" : isDonor ? "DONOR" : "NGO";

    // Idempotency: already in target state → no-op success.
    if (claim.status === targetStatus && body.action !== "accept") {
      return ok({ claim: { id: claim.id, status: claim.status }, alreadyApplied: true });
    }

    // Permission shortcut checks per action.
    if (body.action === "accept" || body.action === "reject") {
      if (!isDonor && !isAdmin) return fail("Only the donor can respond to a claim request.", 403, "FORBIDDEN");
    }
    if (body.action === "cancel" && !isNgo && !isAdmin) {
      return fail("Only the requesting NGO can cancel this request.", 403, "FORBIDDEN");
    }
    if (["ready", "picked_up"].includes(body.action) && !isDonor && !isAdmin) {
      return fail("Only the donor can confirm pickup readiness or collection.", 403, "FORBIDDEN");
    }
    if ((body.action === "complete" || body.action === "delivered") && !isNgo && !isAdmin) {
      return fail("Only the receiving NGO can confirm completion.", 403, "FORBIDDEN");
    }
    if (body.action === "dispute" && !isAdmin && !isNgo && !isDonor) {
      return fail("Not allowed.", 403, "FORBIDDEN");
    }

    // Workflow gate: never complete before the required confirmation chain.
    if (body.action === "complete" && !["PICKED_UP", "DELIVERED", "DISPUTED"].includes(claim.status)) {
      return fail("A donation can only be completed after the food was picked up.", 409, "INVALID_TRANSITION");
    }

    // Validate against the state machine.
    if (!canTransitionClaim(claim.status as never, targetStatus as never, actorRole as never)) {
      return fail(
        `Cannot move a ${claim.status} claim to ${targetStatus}.`,
        409,
        "INVALID_TRANSITION"
      );
    }

    // ---- Approved quantity on accept (with atomic reservation) ----
    if (body.action === "accept") {
      const approved = body.approvedQuantity ?? claim.requestedQuantity;
      if (approved <= 0) return fail("Approved quantity must be positive.", 422, "VALIDATION");
      if (approved > claim.requestedQuantity) {
        return fail("Approved quantity cannot exceed the requested quantity.", 422, "VALIDATION");
      }

      const alreadyAccepted = claim.status === "ACCEPTED";
      const result = await db.$transaction(async (tx) => {
        // Atomic conditional decrement — prevents concurrent over-reservation.
        if (!alreadyAccepted && approved > 0) {
          const reserved = await tx.foodListing.updateMany({
            where: {
              id: claim.listingId,
              remainingQuantity: { gte: approved },
              status: { in: ["AVAILABLE", "PARTIALLY_RESERVED"] },
              pickupDeadline: { gt: new Date() },
            },
            data: { remainingQuantity: { decrement: approved } },
          });
          if (reserved.count === 0) {
            throw Object.assign(
              new Error("Not enough quantity left — someone else may have reserved it just now."),
              { status: 409 }
            );
          }
        }

        const fresh = await tx.foodListing.findUnique({ where: { id: claim.listingId } });
        if (fresh) {
          const nextStatus = fresh.remainingQuantity <= 0 ? "FULLY_RESERVED" : "PARTIALLY_RESERVED";
          await tx.foodListing.update({ where: { id: fresh.id }, data: { status: nextStatus } });
        }

        const updated = await tx.foodClaim.update({
          where: { id: claim.id },
          data: {
            status: "ACCEPTED",
            approvedQuantity: approved,
            pickupCode: claim.pickupCode ?? randomCode(),
            updatedAt: new Date(),
          },
        });

        await tx.claimStatusHistory.create({
          data: {
            claimId: claim.id,
            actorId: user.id,
            previousStatus: alreadyAccepted ? "ACCEPTED" : claim.status,
            newStatus: "ACCEPTED",
            reason: body.reason || `Approved ${approved} ${claim.listing.unit}`,
          },
        });

        await tx.notification.create({
          data: {
            recipientId: claim.ngoId,
            type: "CLAIM_ACCEPTED",
            title: "Claim accepted",
            message: `Your claim for "${claim.listing.title}" was accepted (${approved} ${claim.listing.unit}). Collection code: ${updated.pickupCode}.`,
            linkUrl: "/dashboard/ngo/claims",
          },
        });

        return updated;
      });

      await audit({ actorId: user.id, action: "CLAIM_ACCEPTED", targetType: "FOOD_CLAIM", targetId: id, metadata: { approved } });
      return ok({ claim: { id: result.id, status: result.status, approvedQuantity: result.approvedQuantity } });
    }

    // ---- Transitions that release reserved inventory ----
    if (["reject", "cancel"].includes(body.action)) {
      const approved = claim.approvedQuantity ?? 0;
      const willRelease = releasesInventory(claim.status as never, approved);

      const result = await db.$transaction(async (tx) => {
        if (willRelease) {
          await tx.foodListing.update({
            where: { id: claim.listingId },
            data: { remainingQuantity: { increment: approved } },
          });
          const fresh = await tx.foodListing.findUnique({ where: { id: claim.listingId } });
          if (fresh) {
            const nextStatus = fresh.remainingQuantity >= fresh.quantity ? "AVAILABLE" : "PARTIALLY_RESERVED";
            await tx.foodListing.update({ where: { id: fresh.id }, data: { status: nextStatus } });
          }
        }

        const updated = await tx.foodClaim.update({
          where: { id: claim.id },
          data: { status: targetStatus, rejectionReason: body.reason ?? null, updatedAt: new Date() },
        });

        await tx.claimStatusHistory.create({
          data: {
            claimId: claim.id,
            actorId: user.id,
            previousStatus: claim.status,
            newStatus: targetStatus,
            reason: body.reason || null,
          },
        });

        // Notify the counterparty.
        const notifyTo = isNgo ? claim.listing.donorId : claim.ngoId;
        await tx.notification.create({
          data: {
            recipientId: notifyTo,
            type: body.action === "reject" ? "CLAIM_REJECTED" : "SYSTEM",
            title: body.action === "reject" ? "Claim rejected" : "Claim cancelled",
            message: `Claim on "${claim.listing.title}" was ${targetStatus.toLowerCase()}${body.reason ? `: ${body.reason}` : "."}`,
            linkUrl: isNgo ? "/dashboard/donor/claims" : "/dashboard/ngo/claims",
          },
        });

        return updated;
      });

      await audit({ actorId: user.id, action: `CLAIM_${targetStatus}`, targetType: "FOOD_CLAIM", targetId: id, reason: body.reason, metadata: { inventoryReleased: willRelease } });
      return ok({ claim: { id: result.id, status: result.status } });
    }

    // ---- Simple status transitions ----
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.foodClaim.update({
        where: { id: claim.id },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
          ...(body.action === "picked_up" && !claim.pickupCode ? { pickupCode: randomCode() } : {}),
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          actorId: user.id,
          previousStatus: claim.status,
          newStatus: targetStatus,
          reason: body.reason || null,
        },
      });

      // Listing status follows the claim lifecycle when fully collected.
      if (targetStatus === "PICKED_UP") {
        await tx.foodListing.update({ where: { id: claim.listingId }, data: { status: "PICKED_UP" } });
      }
      if (targetStatus === "COMPLETED") {
        const openClaims = await tx.foodClaim.count({
          where: { listingId: claim.listingId, status: { in: ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP", "DELIVERED"] } },
        });
        if (openClaims === 0) {
          const fresh = await tx.foodListing.findUnique({ where: { id: claim.listingId } });
          if (fresh && fresh.remainingQuantity <= 0) {
            await tx.foodListing.update({ where: { id: claim.listingId }, data: { status: "COMPLETED" } });
          }
        }
        await tx.notification.create({
          data: {
            recipientId: claim.listing.donorId,
            type: "DELIVERY_COMPLETED",
            title: "Donation completed",
            message: `"${claim.listing.title}" was successfully collected and marked complete.`,
            linkUrl: "/dashboard/donor/claims",
          },
        });
      }
      if (targetStatus === "READY_FOR_PICKUP") {
        await tx.notification.create({
          data: {
            recipientId: claim.ngoId,
            type: "PICKUP_REMINDER",
            title: "Ready for pickup",
            message: `"${claim.listing.title}" is packed and ready for collection.`,
            linkUrl: "/dashboard/ngo/claims",
          },
        });
      }
      if (targetStatus === "DISPUTED") {
        await tx.notification.create({
          data: {
            recipientId: claim.listing.donorId,
            type: "SYSTEM",
            title: "Claim disputed",
            message: `A claim on "${claim.listing.title}" was disputed. Platform admins will review.`,
            linkUrl: "/dashboard/donor/claims",
          },
        });
      }

      return updated;
    });

    await audit({ actorId: user.id, action: `CLAIM_${targetStatus}`, targetType: "FOOD_CLAIM", targetId: id });
    return ok({ claim: { id: result.id, status: result.status } });
  } catch (err) {
    return handleError(err);
  }
}

function randomCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[randomInt(chars.length)];
  return out;
}
