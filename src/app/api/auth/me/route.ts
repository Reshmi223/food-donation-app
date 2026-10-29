import { getSession, requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

/** GET /api/auth/me — current session user (null when signed out). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return ok(null);
    const user = await requireUser();
    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      organizationName: user.organizationName,
      verificationStatus: user.verificationStatus,
      avatarUrl: user.avatarUrl,
    });
  } catch {
    return ok(null);
  }
}
