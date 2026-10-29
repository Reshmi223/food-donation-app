import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { audit } from "@/lib/audit";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

/**
 * GET /api/analytics/export?type=listings|claims|donations|audit
 * Authorized CSV exports for donors (own data) and admins (platform data).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("DONOR", "NGO", "ADMIN");
    const type = req.nextUrl.searchParams.get("type") ?? "claims";

    let rows: Record<string, unknown>[] = [];
    if (type === "listings") {
      const listings = await db.foodListing.findMany({
        where: user.role === "DONOR" ? { donorId: user.id } : user.role === "ADMIN" ? {} : undefined,
        include: { donor: { select: { displayName: true, organizationName: true } } },
        orderBy: { createdAt: "desc" },
      });
      rows = listings.map((l) => ({
        id: l.id, title: l.title, category: l.category, dietary: l.dietary,
        quantity: l.quantity, unit: l.unit, status: l.status,
        district: l.district, locality: l.pickupLocality,
        donor: l.donor?.organizationName ?? l.donor?.displayName ?? "",
        preparedAt: l.preparedAt.toISOString(), pickupDeadline: l.pickupDeadline.toISOString(),
        createdAt: l.createdAt.toISOString(),
      }));
    } else if (type === "donations" || type === "claims") {
      const claims = await db.foodClaim.findMany({
        where: user.role === "DONOR" ? { listing: { donorId: user.id } } : user.role === "NGO" ? { ngoId: user.id } : {},
        include: {
          listing: { select: { title: true, unit: true, category: true } },
          ngo: { select: { organizationName: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = claims.map((c) => ({
        id: c.id, listing: c.listing.title, category: c.listing.category,
        ngo: c.ngo.organizationName ?? c.ngo.displayName,
        requestedQuantity: c.requestedQuantity, approvedQuantity: c.approvedQuantity ?? "",
        unit: c.listing.unit, status: c.status,
        peopleToServe: c.peopleToServe ?? "",
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      }));
    } else if (type === "audit") {
      if (user.role !== "ADMIN") return handleError(Object.assign(new Error("forbidden"), { status: 403 }));
      const logs = await db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 2000,
        include: { actor: { select: { displayName: true, email: true } } },
      });
      rows = logs.map((l) => ({
        id: l.id, action: l.action, actor: l.actor?.email ?? "system",
        targetType: l.targetType ?? "", targetId: l.targetId ?? "",
        reason: l.reason ?? "", createdAt: l.createdAt.toISOString(),
      }));
    } else {
      return handleError(Object.assign(new Error("Unknown export type"), { status: 400 }));
    }

    await audit({ actorId: user.id, action: "DATA_EXPORTED", targetType: "CSV", targetId: type });

    const csv = toCSV(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="remeal-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
