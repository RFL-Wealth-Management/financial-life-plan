import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";

const authFile = "e2e/.auth/state.json";

// Signs in once with a real test account and saves the session for the specs.
// Credentials come from the environment (never hard-code them):
//   E2E_EMAIL / E2E_PASSWORD  (put them in a git-ignored .env)
// The account should be an ADMIN on a dev server, so the "Fill mock data" /
// "Generate Mock Data" shortcuts the specs use are visible.
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set E2E_EMAIL and E2E_PASSWORD (e.g. in a git-ignored .env) to a test account."
    );
  }

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL("**/dashboard", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  fs.mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
