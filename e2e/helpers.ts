import { type Page, type Download, expect } from "@playwright/test";
import fs from "node:fs";

const CREATED_PLANS_FILE = "e2e/.artifacts/created-plans.txt";

/**
 * Record the id of every plan created via /api/generate/{iflp,fflp} (returned in
 * the X-Plan-Id response header) so global-teardown can delete them afterwards.
 * Attach this at the start of any spec that generates a document.
 */
export function trackCreatedPlans(page: Page): void {
  page.on("response", (res) => {
    if (/\/api\/generate\/(iflp|fflp)\b/.test(res.url())) {
      const id = res.headers()["x-plan-id"];
      if (id) {
        fs.mkdirSync("e2e/.artifacts", { recursive: true });
        fs.appendFileSync(CREATED_PLANS_FILE, id + "\n");
      }
    }
  });
}

/**
 * Run `action` and wait for the .docx download it triggers, returning the
 * Download so the caller can assert on its filename.
 */
export async function expectDocxDownload(
  page: Page,
  action: () => Promise<void>
): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    action(),
  ]);
  return download;
}

/** Jump to a wizard step by clicking its title in the progress bar. */
export async function gotoStep(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible();
}
