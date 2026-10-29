import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { listingAssistant } from "@/lib/ai";

/** POST /api/ai/assistant — AI listing assistant for donors (labeled estimate). */
export async function POST(req: NextRequest) {
  try {
    await requireRole("DONOR");
    const body = await req.json();
    const title = String(body.title ?? "").slice(0, 140);
    const description = String(body.description ?? "").slice(0, 2000);
    if (title.length < 4 || description.length < 10) return fail("Add a title and a short description first.", 422);
    const result = await listingAssistant({ title, description });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
