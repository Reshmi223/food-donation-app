import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/** GET /api/admin/reports — safety reports queue (aliases public GET with auth). */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const status = req.nextUrl.searchParams.get("status");
    const reports = await db.safetyReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { displayName: true, organizationName: true, email: true } },
        listing: { select: { id: true, title: true, status: true, district: true } },
      },
    });
    return ok({ reports });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/admin/reports — resolve/dismiss a safety report with resolution
 * details. Optionally removes the reported listing. Always audited.
 * Body: { id, status: "REVIEWING"|"RESOLVED"|"DISMISSED", resolution, removeListing }
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();
    const { id, status, resolution, removeListing } = body as {
      id?: string; status?: string; resolution?: string; removeListing?: boolean;
    };
    if (!id || !["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].includes(status ?? "")) {
      return fail("Provide report id and a valid status.", 422);
    }
    if ((status === "RESOLVED" || status === "DISMISSED") && !resolution?.trim()) {
      return fail("Resolution details are required.", 422);
    }

    const report = await db.safetyReport.findUnique({ where: { id } });
    if (!report) return fail("Report not found.", 404);

    await db.$transaction(async (tx) => {
      await tx.safetyReport.update({
        where: { id },
        data: { status, resolution, resolvedById: admin.id, updatedAt: new Date() },
      });
      if (report.reporterId) {
        await tx.notification.create({
          data: {
            recipientId: report.reporterId,
            type: "SAFETY_REPORT_UPDATE",
            title: `Report ${status.toLowerCase()}`,
            message: `Your safety report was marked ${status.toLowerCase()}.${resolution ? ` ${resolution}` : ""}`,
            linkUrl: "/notifications",
          },
        });
      }
      if (removeListing && report.listingId) {
        await tx.foodListing.update({
          where: { id: report.listingId },
          data: { status: "WITHDRAWN", flaggedReason: `Removed after safety report: ${report.category}` },
        });
        // Cancel open claims and release reserved inventory.
        const claims = await tx.foodClaim.findMany({
          where: { listingId: report.listingId, status: { in: ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP"] } },
        });
        for (const c of claims) {
          await tx.foodClaim.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
          await tx.claimStatusHistory.create({
            data: { claimId: c.id, actorId: admin.id, previousStatus: c.status, newStatus: "CANCELLED", reason: "Listing removed after safety review" },
          });
          if (["ACCEPTED", "READY_FOR_PICKUP"].includes(c.status) && (c.approvedQuantity ?? 0) > 0) {
            await tx.foodListing.update({ where: { id: report.listingId }, data: { remainingQuantity: { increment: c.approvedQuantity! } } });
          }
        }
      } else if (report.listingId && status === "DISMISSED") {
        // Restore a flagged listing when the report is dismissed.
        await tx.foodListing.updateMany({
          where: { id: report.listingId, status: "FLAGGED" },
          data: { status: "AVAILABLE", flaggedReason: null },
        });
      }
    });

    await audit({
      actorId: admin.id,
      action: `SAFETY_REPORT_${status}`,
      targetType: "SAFETY_REPORT",
      targetId: id,
      reason: resolution,
      metadata: { removeListing: Boolean(removeListing), listingId: report.listingId },
    });
    void notify;
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
