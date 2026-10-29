import { redirect } from "next/navigation";

/** Compatibility redirect — the notification center lives at /notifications. */
export default function DashboardNotificationsRedirect() {
  redirect("/notifications");
}
