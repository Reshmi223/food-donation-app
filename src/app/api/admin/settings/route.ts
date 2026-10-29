import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

/** GET /api/admin/settings — platform configuration (privileged). */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const settings = await db.platformSetting.findMany({ orderBy: { key: "asc" } });
    const categories = await db.foodCategory.findMany({ orderBy: { sortOrder: "asc" } });
    const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return ok({ settings, categories, messages });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PUT /api/admin/settings — updates a platform setting.
 * Body: { key, value } or { category: {key, label, active} }
 */
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();

    if (body.setting) {
      const { key, value } = body.setting as { key?: string; value?: string };
      if (!key || typeof value !== "string") return fail("Provide setting key and value.", 422);
      await db.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      await audit({ actorId: admin.id, action: "SETTING_UPDATED", targetType: "PLATFORM_SETTING", targetId: key, metadata: { value } });
      return ok({ success: true });
    }

    if (body.category) {
      const { key, active } = body.category as { key?: string; active?: boolean };
      if (!key) return fail("Provide category key.", 422);
      await db.foodCategory.update({ where: { key }, data: { active: Boolean(active) } });
      await audit({ actorId: admin.id, action: "CATEGORY_UPDATED", targetType: "FOOD_CATEGORY", targetId: key, metadata: { active } });
      return ok({ success: true });
    }

    return fail("Nothing to update.", 422);
  } catch (err) {
    return handleError(err);
  }
}
