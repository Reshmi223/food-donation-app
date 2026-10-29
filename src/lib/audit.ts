// REMEAL audit log — records actor, action, target, reason, timestamp for
// privileged and security-relevant operations. Audit rows are never editable
// through the API by ordinary users (no update/delete routes exist).

import { db } from "@/lib/db";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record audit entry", err);
  }
}
