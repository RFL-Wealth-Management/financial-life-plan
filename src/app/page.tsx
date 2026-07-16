import { getProfile } from "@/lib/auth";
import { PlanForm } from "@/components/PlanForm";

export default async function Home() {
  const profile = await getProfile();

  // Only decides whether the Admin link is rendered. /admin gates itself.
  return <PlanForm isAdmin={profile?.role === "admin"} />;
}
