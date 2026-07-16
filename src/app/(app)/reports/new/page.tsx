import { PlanForm } from "@/components/PlanForm";

/**
 * The isAdmin prop is gone: the sidebar in (app)/layout.tsx now decides what
 * navigation each role sees, so the form no longer carries its own chrome.
 */
export default function NewReportPage() {
  return <PlanForm />;
}
