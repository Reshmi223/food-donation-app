import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { handleError, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/**
 * POST /api/auth/register
 * Public registration. Role can only be DONOR | NGO | VOLUNTEER — an ADMIN role
 * in the payload is rejected. All roles start PENDING (NGOs additionally need
 * verification review before they can claim food).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    if (data.role === ("ADMIN" as string)) {
      return fail("Administrator accounts cannot be created through public registration.", 403, "INVALID_ROLE");
    }

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return fail("An account with this email already exists. Try signing in.", 409, "EMAIL_TAKEN");
    }

    // Validate org type against role
    const validOrgType =
      data.role === "DONOR"
        ? ["RESTAURANT", "HOTEL", "WEDDING_HALL", "CATERING", "SUPERMARKET", "EVENT_ORGANIZER", "OTHER"]
        : ["NGO", "CHARITY", "SHELTER", "COMMUNITY_ORG"];
    const orgType = data.organizationType && validOrgType.includes(data.organizationType) ? data.organizationType : validOrgType[0];

    const user = await db.user.create({
      data: {
        email: data.email,
        passwordHash: hashPassword(data.password),
        role: data.role,
        displayName: data.displayName,
        organizationName: data.organizationName || null,
        organizationType: orgType,
        phone: data.phone || null,
        locality: data.locality || null,
        district: data.district,
        state: data.state || "Tamil Nadu",
        verificationStatus: "PENDING",
        emailVerified: false,
      },
    });

    await audit({
      actorId: user.id,
      action: "USER_REGISTERED",
      targetType: "USER",
      targetId: user.id,
      metadata: { role: user.role },
    });

    await notify({
      recipientId: user.id,
      type: "SYSTEM",
      title: "Welcome to REMEAL",
      message:
        data.role === "NGO"
          ? "Submit your organization verification documents to become eligible to claim food."
          : "Complete your profile to start rescuing food.",
      linkUrl: data.role === "NGO" ? "/dashboard/ngo/profile" : "/dashboard",
    });

    const token = createSessionToken({ userId: user.id, email: user.email, role: user.role as "DONOR", name: user.displayName });
    await setSessionCookie(token);

    return ok({
      user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName, verificationStatus: user.verificationStatus },
      redirect: data.role === "DONOR" ? "/dashboard/donor" : data.role === "NGO" ? "/dashboard/ngo" : "/dashboard/volunteer",
    });
  } catch (err) {
    return handleError(err);
  }
}
