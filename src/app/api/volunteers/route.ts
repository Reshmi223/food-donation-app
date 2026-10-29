import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

/**
 * GET /api/volunteers — donors/admins can list VERIFIED, available volunteers
 * for delivery assignment. Only minimal, non-sensitive fields are returned.
 */
export async function GET() {
  try {
    await requireRole("DONOR", "ADMIN");
    const volunteers = await db.user.findMany({
      where: { role: "VOLUNTEER", verificationStatus: "VERIFIED", available: true },
      select: { id: true, displayName: true, district: true, locality: true },
      orderBy: { displayName: "asc" },
      take: 100,
    });
    return ok({ volunteers });
  } catch (err) {
    return handleError(err);
  }
}
