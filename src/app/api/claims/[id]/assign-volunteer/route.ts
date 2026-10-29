import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/**
 * POST /api/claims/[id]/assign-volunteer — donor/admin assigns an available,
 * verified volunteer to an accepted claim. Sensitive pickup details are only
 * shared through the assignment, never publicly.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const { volunteerId, dropoffAddress, dropoffNotes } = body as {
      volunteerId?: string;
      dropoffAddress?: string;
      dropoffNotes?: string;
    };
    if (!volunteerId) return fail("Select a volunteer.", 422);
    if (!dropoffAddress || dropoffAddress.trim().length < 6) {
      return fail("Enter the drop-off address for the volunteer.", 422);
    }

    const claim = await db.foodClaim.findUnique({ where: { id }, include: { listing: true, ngo: true } });
    if (!claim) return fail("Claim not found.", 404, "NOT_FOUND");
    if (claim.listing.donorId !== user.id && user.role !== "ADMIN") {
      return fail("Only the donor or an admin can assign volunteers.", 403, "FORBIDDEN");
    }
    if (!["ACCEPTED", "READY_FOR_PICKUP"].includes(claim.status)) {
      return fail("Volunteers can only be assigned to accepted claims.", 409, "INVALID_TRANSITION");
    }
    const existing = await db.volunteerAssignment.findFirst({
      where: { claimId: claim.id, status: { in: ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "PICKED_UP"] } },
    });
    if (existing) return fail("A volunteer is already assigned to this delivery.", 409, "ALREADY_ASSIGNED");

    const volunteer = await db.user.findUnique({ where: { id: volunteerId } });
    if (!volunteer || volunteer.role !== "VOLUNTEER") return fail("Selected user is not a volunteer.", 422);
    if (volunteer.verificationStatus !== "VERIFIED") return fail("This volunteer is not verified yet.", 422);

    const assignment = await db.volunteerAssignment.create({
      data: {
        claimId: claim.id,
        volunteerId: volunteer.id,
        status: "ASSIGNED",
        dropoffAddress,
        dropoffNotes: dropoffNotes ?? null,
      },
    });

    await notify({
      recipientId: volunteer.id,
      type: "VOLUNTEER_ASSIGNMENT",
      title: "New delivery assignment",
      message: `You were assigned a delivery from ${claim.listing.pickupLocality} to ${claim.ngo.locality ?? claim.ngo.district ?? "the NGO"}.`,
      linkUrl: "/dashboard/volunteer",
    });
    await notify({
      recipientId: claim.ngoId,
      type: "VOLUNTEER_ASSIGNMENT",
      title: "Volunteer assigned",
      message: `A delivery volunteer was assigned for "${claim.listing.title}".`,
      linkUrl: "/dashboard/ngo/claims",
    });

    await audit({
      actorId: user.id,
      action: "VOLUNTEER_ASSIGNED",
      targetType: "VOLUNTEER_ASSIGNMENT",
      targetId: assignment.id,
      metadata: { claimId: claim.id, volunteerId: volunteer.id },
    });
    return ok({ assignment: { id: assignment.id } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
