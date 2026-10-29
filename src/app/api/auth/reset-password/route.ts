import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

/** POST /api/auth/reset-password — consumes a single-use, time-limited token. */
export async function POST(req: NextRequest) {
  try {
    const data = resetPasswordSchema.parse(await req.json());
    const tokenHash = createHash("sha256").update(data.token).digest("hex");

    const record = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return fail("This reset link is invalid or has expired. Please request a new one.", 400, "INVALID_TOKEN");
    }

    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash: hashPassword(data.password) } }),
      db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    await audit({ actorId: record.userId, action: "PASSWORD_RESET_COMPLETED", targetType: "USER", targetId: record.userId });
    return ok({ success: true, message: "Password updated. You can now sign in with your new password." });
  } catch (err) {
    return handleError(err);
  }
}
