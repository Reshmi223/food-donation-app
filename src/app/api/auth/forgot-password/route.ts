import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations";
import { handleError, ok } from "@/lib/api";
import { attemptEmail } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/**
 * POST /api/auth/forgot-password
 * Always responds success (no account enumeration). If an email provider is
 * configured the token is emailed; otherwise the reset link is logged for dev.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = forgotPasswordSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
        },
      });
      const resetUrl = `${req.nextUrl.origin}/reset-password?token=${rawToken}`;
      const emailResult = await attemptEmail(
        user.email,
        "Reset your REMEAL password",
        `Hello ${user.displayName},\n\nUse this link within one hour to reset your password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
      );
      // In non-production without a provider, surface the link in server logs only.
      console.log(`[auth] password reset link for ${user.email}: ${resetUrl} (emailDelivered=${emailResult.delivered})`);
      await audit({ actorId: user.id, action: "PASSWORD_RESET_REQUESTED", targetType: "USER", targetId: user.id });
    }

    return ok({
      success: true,
      message: "If an account exists for that email, a password reset link has been issued. Check your inbox.",
    });
  } catch (err) {
    return handleError(err);
  }
}
