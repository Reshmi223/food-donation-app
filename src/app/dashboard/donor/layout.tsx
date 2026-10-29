import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  if (result.user.role !== "DONOR" && result.user.role !== "ADMIN") redirect("/dashboard");
  return <>{children}</>;
}
