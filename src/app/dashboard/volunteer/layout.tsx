import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  if (result.user.role !== "VOLUNTEER" && result.user.role !== "ADMIN") redirect("/dashboard");
  return <>{children}</>;
}
