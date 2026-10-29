import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

/** GET /api/volunteer/assignments — current volunteer's delivery assignments. */
export async function GET() {
  try {
    const user = await requireRole("VOLUNTEER", "ADMIN");
    const where = user.role === "ADMIN" ? {} : { volunteerId: user.id };
    const assignments = await db.volunteerAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      include: {
        claim: {
          include: {
            listing: {
              select: {
                id: true, title: true, pickupLocality: true, district: true,
                pickupDeadline: true, unit: true, images: true,
              },
            },
            ngo: { select: { id: true, organizationName: true, displayName: true, locality: true, district: true } },
          },
        },
      },
    });
    return ok({ assignments });
  } catch (err) {
    return handleError(err);
  }
}
