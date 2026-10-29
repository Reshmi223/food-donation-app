import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { canTransitionVolunteer } from "@/lib/claims";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/**
 * PATCH /api/volunteer/assignments/[id]
 * Volunteer delivery flow: ASSIGNED → ACCEPTED → ON_THE_WAY → PICKED_UP →
 * DELIVERED → VERIFIED_COMPLETE. Server-validated, idempotent transitions.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("VOLUNTEER", "ADMIN");
    const { id } = await ctx.params;
    const body = await req.json();
    const { status, dropoffAddress, pickupNotes, dropoffNotes, proofUploadId } = body as {
      status?: string;
      dropoffAddress?: string;
      pickupNotes?: string;
      dropoffNotes?: string;
      proofUploadId?: string;
    };

    const assignment = await db.volunteerAssignment.findUnique({
      where: { id },
      include: {
        claim: { include: { listing: true, ngo: true } },
      },
    });
    if (!assignment) return fail("Assignment not found.", 404, "NOT_FOUND");
    if (user.role === "VOLUNTEER" && assignment.volunteerId !== user.id) {
      return fail("This assignment does not belong to you.", 403, "FORBIDDEN");
    }

    // Drop-off proof required to mark DELIVERED (authorized proof-of-delivery).
    if (status === "DELIVERED") {
      if (!dropoffAddress || dropoffAddress.trim().length < 6) {
        return fail("Enter the drop-off location where the food was delivered.", 422, "VALIDATION");
      }
      if (!proofUploadId) {
        return fail("Upload proof of delivery (a photo) to confirm the drop-off.", 422, "VALIDATION");
      }
      const proof = await db.upload.findUnique({ where: { id: proofUploadId } });
      if (!proof || proof.ownerId !== user.id) {
        return fail("Invalid proof upload.", 422, "VALIDATION");
      }
    }

    if (status && !canTransitionVolunteer(assignment.status as never, status as never)) {
      if (assignment.status === status) return ok({ alreadyApplied: true, status: assignment.status });
      return fail(`Cannot move a ${assignment.status} assignment to ${status}.`, 409, "INVALID_TRANSITION");
    }

    const updated = await db.$transaction(async (tx) => {
      const a = await tx.volunteerAssignment.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          dropoffAddress: dropoffAddress ?? undefined,
          pickupNotes: pickupNotes ?? undefined,
          dropoffNotes: dropoffNotes ?? undefined,
          proofUploadId: proofUploadId ?? undefined,
          acceptedAt: status === "ACCEPTED" ? new Date() : undefined,
          completedAt: status === "DELIVERED" || status === "VERIFIED_COMPLETE" ? new Date() : undefined,
        },
      });

      // Keep the claim in sync with delivery progress.
      if (status === "PICKED_UP") {
        await tx.foodClaim.update({ where: { id: assignment.claimId }, data: { status: "PICKED_UP" } });
        await tx.claimStatusHistory.create({
          data: { claimId: assignment.claimId, actorId: user.id, previousStatus: "READY_FOR_PICKUP", newStatus: "PICKED_UP", reason: "Volunteer picked up" },
        });
        await tx.foodListing.update({ where: { id: assignment.claim.listingId }, data: { status: "PICKED_UP" } });
      }
      if (status === "DELIVERED") {
        await tx.foodClaim.update({ where: { id: assignment.claimId }, data: { status: "DELIVERED" } });
        await tx.claimStatusHistory.create({
          data: { claimId: assignment.claimId, actorId: user.id, previousStatus: "PICKED_UP", newStatus: "DELIVERED", reason: "Volunteer delivered" },
        });
      }
      if (status === "VERIFIED_COMPLETE") {
        const claim = await tx.foodClaim.findUnique({ where: { id: assignment.claimId } });
        if (claim && claim.status === "DELIVERED") {
          await tx.foodClaim.update({ where: { id: claim.id }, data: { status: "COMPLETED" } });
          await tx.claimStatusHistory.create({
            data: { claimId: claim.id, actorId: user.id, previousStatus: "DELIVERED", newStatus: "COMPLETED", reason: "Delivery verified" },
          });
        }
      }
      if (status === "CANCELLED") {
        await tx.notification.create({
          data: {
            recipientId: assignment.claim.listing.donorId,
            type: "SYSTEM",
            title: "Delivery cancelled",
            message: `The volunteer cancelled the delivery for "${assignment.claim.listing.title}". You can assign another volunteer.`,
            linkUrl: "/dashboard/donor/claims",
          },
        });
      }

      await tx.notification.create({
        data: {
          recipientId: assignment.claim.ngoId,
          type: "DELIVERY_COMPLETED",
          title: status === "DELIVERED" ? "Food delivered" : "Delivery update",
          message: `Delivery for "${assignment.claim.listing.title}" is now ${status}.`,
          linkUrl: "/dashboard/ngo/claims",
        },
      });

      return a;
    });

    await audit({ actorId: user.id, action: `VOLUNTEER_${status}`, targetType: "VOLUNTEER_ASSIGNMENT", targetId: id });
    return ok({ assignment: { id: updated.id, status: updated.status } });
  } catch (err) {
    return handleError(err);
  }
}
