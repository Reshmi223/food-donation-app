import { clearSessionCookie } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

/** POST /api/auth/logout — clears the session cookie. */
export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
