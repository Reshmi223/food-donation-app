import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/** GET /api/admin/verifications — list verification requests with org details. */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const status = req.nextUrl.searchParams.get("status");
    const verifications = await db.organizationVerification.findMany({
      where: status ? { reviewStatus: status } : undefined,
      orderBy: { submittedAt: "desc" },
      include: {
        organization: {
          select: {
            id: true, email: true, displayName: true, organizationName: true,
            organizationType: true, phone: true, district: true, locality: true,
            verificationStatus: true, createdAt: true,
          },
        },
        reviewer: { select: { displayName: true } },
      },
    });
    return ok({ verifications });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/admin/verifications — approve/reject with reason (audited).
 * Body: { id, decision: "APPROVED"|"REJECTED", reviewNotes }
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();
    const { id, decision, reviewNotes } = body as { id?: string; decision?: string; reviewNotes?: string };
    if (!id || !["APPROVED", "REJECTED"].includes(decision ?? "")) {
      return fail("Provide a verification id and a decision (APPROVED/REJECTED).", 422);
    }

    const verification = await db.organizationVerification.findUnique({ where: { id } });
    if (!verification) return fail("Verification request not found.", 404);
    if (verification.reviewStatus !== "PENDING") {
      return fail("This request was already reviewed.", 409);
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.organizationVerification.update({
        where: { id },
        data: {
          reviewStatus: decision,
          reviewerId: admin.id,
          reviewNotes: reviewNotes ?? null,
          reviewedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: verification.organizationId },
        data: { verificationStatus: decision === "APPROVED" ? "VERIFIED" : "REJECTED" },
      });
      await tx.notification.create({
        data: {
          recipientId: verification.organizationId,
          type: "VERIFICATION_UPDATE",
          title: decision === "APPROVED" ? "Organization verified" : "Verification not approved",
          message:
            decision === "APPROVED"
              ? "Your organization is verified — you can now claim food listings."
              : `Your verification request was not approved.${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`,
          linkUrl: "/dashboard/ngo/profile",
        },
      });
      return updated;
    });

    await audit({
      actorId: admin.id,
      action: `NGO_VERIFICATION_${decision}`,
      targetType: "ORGANIZATION_VERIFICATION",
      targetId: id,
      reason: reviewNotes,
      metadata: { organizationId: verification.organizationId },
    });
    void notify;
    return ok({ success: true, verification: { id: result.id, reviewStatus: result.reviewStatus } });
  } catch (err) {
    return handleError(err);
  }
}
