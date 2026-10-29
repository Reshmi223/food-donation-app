import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { verificationSubmitSchema } from "@/lib/validations";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/** GET /api/verifications — NGO views own verification status. */
export async function GET() {
  try {
    const user = await requireRole("NGO");
    const verification = await db.organizationVerification.findFirst({
      where: { organizationId: user.id },
      orderBy: { submittedAt: "desc" },
    });
    return ok({ verification, accountStatus: user.verificationStatus });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/verifications — NGO submits verification documents for review. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("NGO");
    const data = verificationSubmitSchema.parse(await req.json());

    // Prevent duplicate pending submissions.
    const pending = await db.organizationVerification.findFirst({
      where: { organizationId: user.id, reviewStatus: "PENDING" },
    });
    if (pending) {
      return fail("You already have a verification request under review.", 409, "ALREADY_PENDING");
    }

    const verification = await db.organizationVerification.create({
      data: {
        organizationId: user.id,
        registrationNo: data.registrationNo,
        website: data.website || null,
        documentIds: JSON.stringify(data.documentIds),
        reviewStatus: "PENDING",
      },
    });

    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.allSettled(
      admins.map((a) =>
        notify({
          recipientId: a.id,
          type: "VERIFICATION_UPDATE",
          title: "New verification request",
          message: `${user.organizationName ?? user.displayName} submitted verification documents.`,
          linkUrl: "/dashboard/admin/verifications",
        })
      )
    );

    await audit({
      actorId: user.id,
      action: "VERIFICATION_SUBMITTED",
      targetType: "ORGANIZATION_VERIFICATION",
      targetId: verification.id,
    });
    return ok({ success: true, id: verification.id, message: "Verification request submitted. Our team will review it shortly." }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
