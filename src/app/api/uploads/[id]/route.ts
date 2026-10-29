import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/uploads/[id] — authorized file serving.
 * PUBLIC uploads (food photos, avatars) are served to anyone.
 * PRIVATE uploads (verification docs, proof of delivery) are served only to the
 * owner and administrators — mirroring private storage bucket semantics.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const upload = await db.upload.findUnique({ where: { id } });
    if (!upload) return new Response("Not found", { status: 404 });

    if (upload.visibility === "PRIVATE") {
      const session = await getSession();
      const allowed =
        session && (session.userId === upload.ownerId || session.role === "ADMIN");
      if (!allowed) return new Response("Forbidden", { status: 403 });
    }

    const buffer = Buffer.from(upload.data, "base64");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": upload.mimeType,
        "Cache-Control": upload.visibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, no-store",
      },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}
