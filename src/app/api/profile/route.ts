import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validations";
import { handleError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

/** GET /api/profile — full own profile. */
export async function GET() {
  try {
    const user = await requireUser();
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, role: true, displayName: true, organizationName: true,
        organizationType: true, phone: true, address: true, locality: true, district: true,
        state: true, avatarUrl: true, verificationStatus: true, emailVerified: true,
        preferredCategories: true, capacityPerPickup: true, available: true, createdAt: true,
      },
    });
    return ok({ profile });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/profile — updates permitted profile fields only.
 * Role, verification status and email are NOT updatable here by design.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = profileUpdateSchema.parse(await req.json());

    // Volunteers can manage availability; other fields validated by schema.
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        displayName: data.displayName,
        organizationName: data.organizationName,
        organizationType: data.organizationType,
        phone: data.phone,
        address: data.address,
        locality: data.locality,
        district: data.district,
        state: data.state,
        preferredCategories: data.preferredCategories ? JSON.stringify(data.preferredCategories) : undefined,
        capacityPerPickup: data.capacityPerPickup,
        ...(user.role === "VOLUNTEER" && data.available !== undefined ? { available: data.available } : {}),
      },
    });

    await audit({ actorId: user.id, action: "PROFILE_UPDATED", targetType: "USER", targetId: user.id });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
