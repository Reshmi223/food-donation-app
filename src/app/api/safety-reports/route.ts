import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { safetyReportSchema } from "@/lib/validations";
import { handleError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/** POST /api/safety-reports — any authenticated user can report a listing/claim. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = safetyReportSchema.parse(await req.json());

    const report = await db.safetyReport.create({
      data: {
        reporterId: user.id,
        listingId: data.listingId || null,
        claimId: data.claimId || null,
        category: data.category,
        description: data.description,
        status: "OPEN",
      },
    });

    // Flag the listing for review when reported.
    if (report.listingId) {
      await db.foodListing.updateMany({
        where: { id: report.listingId, status: { in: ["AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED"] } },
        data: { status: "FLAGGED", flaggedReason: `Reported: ${data.category}` },
      });
    }

    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.allSettled(
      admins.map((a) =>
        notify({
          recipientId: a.id,
          type: "SAFETY_REPORT_UPDATE",
          title: "New safety report",
          message: `A ${data.category.replace(/_/g, " ").toLowerCase()} report was filed and needs review.`,
          linkUrl: "/dashboard/admin/reports",
        })
      )
    );

    await audit({ actorId: user.id, action: "SAFETY_REPORT_FILED", targetType: "SAFETY_REPORT", targetId: report.id, metadata: { category: data.category } });
    return ok({ success: true, id: report.id, message: "Thank you — our safety team will review this report." }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

/** GET /api/safety-reports — admins review reports. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const reports = await db.safetyReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { displayName: true, organizationName: true } },
        listing: { select: { id: true, title: true, status: true } },
      },
    });
    return ok({ reports });
  } catch (err) {
    return handleError(err);
  }
}
