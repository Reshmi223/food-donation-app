import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileForm, VerificationPanel } from "@/components/dashboard/profile-form";

export const metadata: Metadata = { title: "NGO Profile & Verification" };

export default async function NgoProfilePage() {
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  const { user } = result;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">NGO profile & verification</h1>
        <p className="text-sm text-muted-foreground">Manage your organization and become eligible to claim food.</p>
      </div>
      <ProfileForm
        user={{
          id: user.id,
          role: user.role as "NGO",
          displayName: user.displayName,
          organizationName: user.organizationName,
          verificationStatus: user.verificationStatus,
          email: user.email,
        }}
      >
        <VerificationPanel />
      </ProfileForm>
    </div>
  );
}
