# End-to-end tests (Playwright)

Real end-to-end tests that sign in and exercise the **IFLP** and **FFLP** flows against
the running app and your linked Supabase.

## What they cover

- **iflp.spec.ts** — create a plan in the IFLP wizard, generate the document (asserts an
  `IFLP-*.docx` download + the "Plan saved" banner), and see it on the dashboard with a
  **Create FFLP** action.
- **fflp.spec.ts** — create an IFLP, confirm **Continue to FFLP** is disabled until the plan
  is generated, hand off to the FFLP form, generate the FFLP (`FFLP-*.docx`), and see the
  dashboard row switch to **Edit FFLP**.

## Prerequisites

1. **A test account.** Set credentials in a git-ignored `.env` at the repo root:
   ```
   E2E_EMAIL=your-test-user@example.com
   E2E_PASSWORD=••••••••
   ```
   Use an **admin** account and run against a **dev** server — that's what exposes the
   "Fill mock data" / "Generate Mock Data" shortcuts the specs use to fill the forms fast.
2. **Supabase keys** in `.env.local` (already present for the app). `SUPABASE_SERVICE_ROLE_KEY`
   is used only to delete the plans the tests create (see Cleanup).
3. **The browser binary** (one-time): `npx playwright install chromium`.

## Run

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # open the last HTML report
```

Playwright reuses your running `npm run dev` (port 3000) if there is one, otherwise it starts
it. Sign-in happens once (`auth.setup.ts`) and the session is reused by every spec.

## Cleanup

These tests write **real** rows to Supabase. Each generated plan's id is captured from the
`X-Plan-Id` response header, and `global-teardown.ts` deletes those plans after the run
(foreign keys cascade to parties, child rows, and `plan_fflp`). If `SUPABASE_SERVICE_ROLE_KEY`
is missing, cleanup is skipped with a warning and the rows must be removed manually.

## Notes

- These are **not** hermetic — they depend on the real database and an admin/dev environment.
  Keep them out of parallel runs (the config already sets `workers: 1`).
- `e2e/.auth/` (saved session) and `e2e/.artifacts/` (created-plan ids) are git-ignored.
