import { test, expect } from "@playwright/test";
import { trackCreatedPlans, expectDocxDownload, gotoStep } from "./helpers";

test.describe("IFLP", () => {
  test("creates a plan and generates the IFLP document", async ({ page }) => {
    trackCreatedPlans(page);

    await page.goto("/reports/new");
    await expect(page.getByRole("heading", { level: 1, name: "People & Profile" })).toBeVisible();

    // Dev+admin shortcut: fill every step with realistic sample data.
    const fillMock = page.getByRole("button", { name: "Fill mock data" });
    await expect(
      fillMock,
      "The 'Fill mock data' button requires an ADMIN test account on a dev server."
    ).toBeVisible();
    await fillMock.click();

    // Jump to the final step and generate.
    await gotoStep(page, "Implementation");
    const download = await expectDocxDownload(page, () =>
      page.getByRole("button", { name: /generate document$/i }).click()
    );

    expect(download.suggestedFilename()).toMatch(/^IFLP-.*\.docx$/);
    await expect(page.getByText("Plan saved")).toBeVisible();
  });

  test("newly saved plan appears on the dashboard with a Create FFLP action", async ({ page }) => {
    trackCreatedPlans(page);

    // Create a plan.
    await page.goto("/reports/new");
    await page.getByRole("button", { name: "Fill mock data" }).click();
    await gotoStep(page, "Implementation");
    await expectDocxDownload(page, () =>
      page.getByRole("button", { name: /generate document$/i }).click()
    );

    // The dashboard lists it with the FFLP entry point.
    await page.goto("/dashboard");
    const firstRow = page.getByRole("listitem").first();
    await expect(firstRow.getByRole("link", { name: /Create FFLP|Edit FFLP/ })).toBeVisible();
  });
});
