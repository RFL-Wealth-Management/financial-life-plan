import { test, expect } from "@playwright/test";
import { trackCreatedPlans, expectDocxDownload, gotoStep } from "./helpers";

test.describe("FFLP", () => {
  // The FFLP extends a saved IFLP, so each test first creates one, then follows
  // the "Continue to FFLP" handoff — the same path a user takes.
  test("creates an IFLP, hands off to FFLP, and generates the FFLP document", async ({ page }) => {
    trackCreatedPlans(page);

    // 1. Create the base IFLP.
    await page.goto("/reports/new");
    await page.getByRole("button", { name: "Fill mock data" }).click();
    await gotoStep(page, "Implementation");

    // "Continue to FFLP" is disabled until the IFLP has been generated.
    const continueToFflp = page.getByRole("button", { name: "Continue to FFLP" });
    await expect(continueToFflp).toBeDisabled();

    await expectDocxDownload(page, () =>
      page.getByRole("button", { name: /generate document$/i }).click()
    );
    await expect(page.getByText("Plan saved")).toBeVisible();

    // 2. Hand off to the FFLP form (now enabled).
    await expect(continueToFflp).toBeEnabled();
    await continueToFflp.click();
    await page.waitForURL(/\/reports\/[^/]+\/fflp$/);
    await expect(page.getByText("FFLP · Step 1")).toBeVisible();

    // 3. Fill the FFLP-only fields and generate.
    await page.getByRole("button", { name: "Generate Mock Data" }).click();
    await gotoStep(page, "Implementation");
    const download = await expectDocxDownload(page, () =>
      page.getByRole("button", { name: "Save & generate document" }).click()
    );

    expect(download.suggestedFilename()).toMatch(/^FFLP-.*\.docx$/);
    await expect(page.getByText("FFLP saved")).toBeVisible();
  });

  test("dashboard shows Edit FFLP once an FFLP exists for a plan", async ({ page }) => {
    trackCreatedPlans(page);

    // Create IFLP + FFLP.
    await page.goto("/reports/new");
    await page.getByRole("button", { name: "Fill mock data" }).click();
    await gotoStep(page, "Implementation");
    await expectDocxDownload(page, () =>
      page.getByRole("button", { name: /generate document$/i }).click()
    );
    await page.getByRole("button", { name: "Continue to FFLP" }).click();
    await page.waitForURL(/\/reports\/[^/]+\/fflp$/);
    await page.getByRole("button", { name: "Generate Mock Data" }).click();
    await expectDocxDownload(page, () =>
      page.getByRole("button", { name: "Save & generate document" }).click()
    );

    // The plan's row now offers "Edit FFLP" rather than "Create FFLP".
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Edit FFLP" }).first()).toBeVisible();
  });
});
