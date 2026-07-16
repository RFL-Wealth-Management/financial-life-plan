import { redirect } from "next/navigation";

/**
 * /admin split into /users (roles) and /reports (documents) when the sidebar
 * landed. Non-admins who follow an old link are bounced on from /dashboard's
 * own checks, so no gate is needed here.
 */
export default function AdminPage() {
  redirect("/dashboard");
}
