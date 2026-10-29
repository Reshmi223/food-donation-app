import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie, verifyPassword, verifySessionToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

/** POST /api/auth/login — email + password sign-in with generic error messages. */
export async function POST(req: NextRequest) {
  try {
    const data = loginSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email: data.email } });

    const failMessage = "Invalid email or password.";
    if (!user) return fail(failMessage, 401, "INVALID_CREDENTIALS");
    if (!verifyPassword(data.password, user.passwordHash)) {
      await audit({ actorId: user.id, action: "LOGIN_FAILED", targetType: "USER", targetId: user.id });
      return fail(failMessage, 401, "INVALID_CREDENTIALS");
    }
    if (user.verificationStatus === "SUSPENDED") {
      return fail("This account has been suspended. Contact support for assistance.", 403, "SUSPENDED");
    }

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as "DONOR",
      name: user.displayName,
    });
    await setSessionCookie(token);

    const redirect =
      user.role === "DONOR" ? "/dashboard/donor"
      : user.role === "NGO" ? "/dashboard/ngo"
      : user.role === "VOLUNTEER" ? "/dashboard/volunteer"
      : user.role === "ADMIN" ? "/dashboard/admin"
      : "/";

    return ok({ user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName }, redirect });
  } catch (err) {
    return handleError(err);
  }
}

/** GET — session probe for lightweight checks. */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("remeal_session")?.value;
  const session = verifySessionToken(cookie);
  return ok({ authenticated: Boolean(session), role: session?.role ?? null });
}
