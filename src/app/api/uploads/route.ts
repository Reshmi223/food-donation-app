import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * POST /api/uploads — stores an image/document as base64 in the DB.
 * `purpose` controls access rules:
 *  - FOOD_PHOTO / AVATAR → PUBLIC (served to anyone)
 *  - VERIFICATION_DOC / PROOF_OF_DELIVERY → PRIVATE (owner, admins, authorized reviewers)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { data: dataUrl, purpose, filename } = body as { data?: string; purpose?: string; filename?: string };

    if (!dataUrl || typeof dataUrl !== "string") return fail("Missing file data.", 422);
    if (!["FOOD_PHOTO", "VERIFICATION_DOC", "PROOF_OF_DELIVERY", "AVATAR"].includes(purpose ?? "")) {
      return fail("Invalid upload purpose.", 422);
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return fail("File must be a base64 data URL.", 422);
    const [, mime, b64] = match;
    if (!ALLOWED_MIME.includes(mime)) {
      return fail("Unsupported file type. Use JPEG, PNG, WebP or PDF.", 422);
    }
    const sizeBytes = Math.floor((b64.length * 3) / 4);
    if (sizeBytes > MAX_SIZE) return fail("File is too large. Maximum size is 4 MB.", 413);

    const visibility = purpose === "FOOD_PHOTO" || purpose === "AVATAR" ? "PUBLIC" : "PRIVATE";

    const upload = await db.upload.create({
      data: {
        ownerId: user.id,
        visibility,
        mimeType: mime,
        sizeBytes,
        data: b64,
        purpose,
      },
    });

    await audit({ actorId: user.id, action: "UPLOAD_CREATED", targetType: "UPLOAD", targetId: upload.id, metadata: { purpose, filename, sizeBytes } });
    return ok({ id: upload.id, sizeBytes }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
