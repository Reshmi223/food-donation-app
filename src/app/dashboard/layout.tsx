import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import type { Role } from "@/lib/constants";

/**
 * Server-side guard for the whole dashboard area.
 * Unauthenticated → /login; role-specific sub-layouts re-check their role.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  if (result.suspended) redirect("/login?error=suspended");

  const { user } = result;
  return (
    <DashboardShell
      user={{
        id: user.id,
        role: user.role as Role,
        displayName: user.displayName,
        organizationName: user.organizationName,
        verificationStatus: user.verificationStatus,
        email: user.email,
      }}
    >
      {children}
    </DashboardShell>
  );
}
