import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

/** GET /api/notifications — current user's notifications + unread count. */
export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, unread] = await Promise.all([
      db.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({ where: { recipientId: user.id, readAt: null } }),
    ]);
    return ok({ notifications, unread });
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH /api/notifications — mark one ({id}) or all ({all:true}) as read. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (body.all) {
      await db.notification.updateMany({
        where: { recipientId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (body.id) {
      await db.notification.updateMany({
        where: { id: body.id, recipientId: user.id },
        data: { readAt: new Date() },
      });
    }
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
