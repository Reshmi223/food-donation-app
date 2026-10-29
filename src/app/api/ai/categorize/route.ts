import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { categorizeFood } from "@/lib/ai";

/** POST /api/ai/categorize — smart food categorization (labeled estimate). */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const title = String(body.title ?? "").slice(0, 140);
    const description = String(body.description ?? "").slice(0, 2000);
    if (title.length < 4) return fail("Enter a title first.", 422);
    const result = await categorizeFood({ title, description, hasImage: Boolean(body.hasImage) });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
