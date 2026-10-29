import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/** GET /api/admin/users — user management list with filters. */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const sp = req.nextUrl.searchParams;
    const role = sp.get("role");
    const status = sp.get("status");
    const q = sp.get("q")?.trim();

    const where = {
      ...(role ? { role } : {}),
      ...(status ? { verificationStatus: status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { displayName: { contains: q } },
              { organizationName: { contains: q } },
            ],
          }
        : {}),
    };

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, role: true, displayName: true, organizationName: true,
        organizationType: true, phone: true, district: true, verificationStatus: true,
        emailVerified: true, suspendedReason: true, createdAt: true,
        _count: { select: { listings: true, claims: true, assignments: true } },
      },
    });
    return ok({ users });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/admin/users — privileged account actions, always audited.
 * Body: { id, action: "SUSPEND"|"ACTIVATE"|"VERIFY"|"REJECT"|"MAKE_DONOR"|"MAKE_NGO"|"MAKE_VOLUNTEER", reason }
 * Note: admins can only assign non-admin roles. Existing admin accounts are protected.
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();
    const { id, action, reason } = body as { id?: string; action?: string; reason?: string };
    if (!id || !action) return fail("Provide user id and action.", 422);
    if ((action === "SUSPEND" || action === "REJECT") && !reason?.trim()) {
      return fail("A reason is required for suspensions and rejections.", 422);
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return fail("User not found.", 404);
    if (target.id === admin.id) return fail("You cannot modify your own admin account.", 409);
    if (target.role === "ADMIN" && action !== "ACTIVATE") {
      return fail("Administrator accounts cannot be modified through this endpoint.", 403);
    }

    let updated;
    switch (action) {
      case "SUSPEND":
        updated = await db.user.update({
          where: { id }, data: { verificationStatus: "SUSPENDED", suspendedReason: reason },
        });
        await notify({ recipientId: id, type: "SYSTEM", title: "Account suspended", message: `Your account was suspended. Reason: ${reason}` });
        break;
      case "ACTIVATE":
        updated = await db.user.update({
          where: { id }, data: { verificationStatus: "PENDING", suspendedReason: null },
        });
        await notify({ recipientId: id, type: "SYSTEM", title: "Account restored", message: "Your account suspension was lifted." });
        break;
      case "VERIFY":
        updated = await db.user.update({ where: { id }, data: { verificationStatus: "VERIFIED" } });
        await notify({ recipientId: id, type: "VERIFICATION_UPDATE", title: "Account verified", message: "Your account was verified by the platform team." });
        break;
      case "REJECT":
        updated = await db.user.update({ where: { id }, data: { verificationStatus: "REJECTED" } });
        await notify({ recipientId: id, type: "VERIFICATION_UPDATE", title: "Account review failed", message: `Your account was not approved. Reason: ${reason}` });
        break;
      case "MAKE_DONOR":
      case "MAKE_NGO":
      case "MAKE_VOLUNTEER": {
        const role = action === "MAKE_DONOR" ? "DONOR" : action === "MAKE_NGO" ? "NGO" : "VOLUNTEER";
        updated = await db.user.update({ where: { id }, data: { role } });
        break;
      }
      default:
        return fail("Unknown action.", 422);
    }

    await audit({
      actorId: admin.id,
      action: `ADMIN_USER_${action}`,
      targetType: "USER",
      targetId: id,
      reason,
      metadata: { email: target.email, previousRole: target.role, previousStatus: target.verificationStatus },
    });
    return ok({ success: true, user: { id: updated.id, role: updated.role, verificationStatus: updated.verificationStatus } });
  } catch (err) {
    return handleError(err);
  }
}
