import { redirect } from "next/navigation";

/**
 * /admin became /users when the sidebar landed, and the all-reports list now
 * lives on the dashboard. Non-admins who follow an old link are bounced on from
 * /dashboard's own checks, so no gate is needed here.
 */
export default function AdminPage() {
  redirect("/dashboard");
}
