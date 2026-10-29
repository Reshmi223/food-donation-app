import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

/** GET /api/admin/audit — security-relevant audit events (read-only). */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const sp = req.nextUrl.searchParams;
    const action = sp.get("action");
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = 50;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: action ? { action: { contains: action } } : undefined,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { displayName: true, email: true, role: true } } },
      }),
      db.auditLog.count({ where: action ? { action: { contains: action } } : undefined }),
    ]);
    return ok({ logs, total, page, pages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleError(err);
  }
}
