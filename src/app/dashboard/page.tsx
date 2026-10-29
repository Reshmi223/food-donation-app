import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardIndexPage() {
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  const { user } = result;
  redirect(
    user.role === "DONOR" ? "/dashboard/donor"
    : user.role === "NGO" ? "/dashboard/ngo"
    : user.role === "VOLUNTEER" ? "/dashboard/volunteer"
    : user.role === "ADMIN" ? "/dashboard/admin"
    : "/login"
  );
}
