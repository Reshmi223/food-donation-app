import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata: Metadata = { title: "Volunteer Profile" };

export default async function VolunteerProfilePage() {
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  const { user } = result;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Volunteer profile</h1>
        <p className="text-sm text-muted-foreground">Manage your contact details and delivery availability.</p>
      </div>
      <ProfileForm
        user={{
          id: user.id,
          role: user.role as "VOLUNTEER",
          displayName: user.displayName,
          organizationName: user.organizationName,
          verificationStatus: user.verificationStatus,
          email: user.email,
        }}
      />
    </div>
  );
}
