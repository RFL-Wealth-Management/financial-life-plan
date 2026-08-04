import { IflpWizard } from "@/components/IflpWizard";

/**
 * The IFLP data-entry wizard. Replaces the old 4-field PlanForm; the sidebar in
 * (app)/layout.tsx provides the surrounding chrome.
 */
export default function NewReportPage() {
  return <IflpWizard />;
}
