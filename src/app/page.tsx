import { redirect } from "next/navigation";

/**
 * The generator used to live here; it is now /reports/new and the dashboard is
 * the landing page. Kept as a redirect so existing links and bookmarks still
 * arrive somewhere sensible.
 */
export default function RootPage() {
  redirect("/dashboard");
}
