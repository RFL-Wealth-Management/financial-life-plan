# FFLP field inventory

The **FFLP** (fully-implemented Financial Life Plan) is the document a client graduates to
after the **IFLP** (Initial Financial Life Plan). It **reuses the IFLP plan as its base**
(same clients, corporation, buckets, advisor block) and adds deeper, implementation-stage
detail on top. Source template: `original files/FFLP Template 2026.docx`; render target:
`templates/fflp.tagged.docx`.

There is no highlight-based extraction for FFLP (the source has reviewer *comments*, not
highlights — see `docs/iflp-fields.md` "Why FFLP is missing"). This inventory is
reconstructed from the template body and grouped into the FFLP wizard's steps.

- **Shared** = already collected by the IFLP wizard and stored on the plan. FFLP reads it
  from the base plan (`loadPlanState`) — it is **not** re-entered in the FFLP form.
- **New** = FFLP-only. Collected by the FFLP wizard (`src/lib/fflp-form.ts`) and stored in
  the `plan_fflp` tables (see `supabase/migrations/20260818000000_fflp_extend.sql`).

## Steps

Built incrementally, the same way the IFLP wizard grew step by step.

### Step 1 — Profile & Income Strategy  ✅ *built*

| Field | Kind | Source / notes |
| --- | --- | --- |
| Cover client names, cover date | Shared | `{coverClients}`, `{client1Name}`, `{client2Name}`, `{coverDate}` |
| CEO welcome | Static | "A Welcome From Our CEO" / "Saad Nadeem, CEO" — static template copy, not a field |
| Retirement Age | Shared | Profile row "Retirement Age: 60". Sourced from the plan's `targetIndependenceAge` — not re-entered in the FFLP form |
| **Recommended Salary** | **New** | Income Strategy → Recommended Structure: "Salary: $250,000 per person (minimum)". `plan_fflp.recommended_salary` |
| Salary-vs-dividend narrative | Static | "How Your Income Supports…" prose — static for now |
| Advisor block | Shared | Final page: `{advisorName}`, `{advisorPhone}`, `{advisorEmail}` (the generating user) |

### Step 2 — Contributions & Allocation  *(later)*

New: Total Monthly Investment; allocation split Personal / Corporate / Insurance.

### Step 3 — Buckets Detail  *(later)*

New: per-client Government (monthly per-person + combined annual); PPP annual income +
current-status note; Corporate Liquid annual income.

### Step 4 — Insurance & Access to Capital  *(later)*

New: per-client Insurance Bucket outcomes (income duration, total tax-free income, death
benefit, total value, return %); per-client Access-to-Capital columns (years 2/4/6/8/10).

### Step 5 — Net Worth & Education  *(later)*

New: Expected Net Worth projection; Education Insurance-Wrapper milestone tables (per-child
values at ages 30/40/50/65/90 and end-of-year 1–5 overview).

### Step 6 — Implementation & Protection  *(later)*

New: Implementation/Funding actions; Protection Planning status toggles (CI/DI "in place"
vs "not in place" variants); Next Steps table.

## Relationship to the database

One FFLP per plan. "An FFLP exists for this plan" == a `plan_fflp` row exists. FFLP-only
scalar fields live on `plan_fflp` (1:1 with `plans`); FFLP-only repeating data goes in
`plan_fflp_*` child tables added as their steps are built. See the migration and
`docs/fflp-tagging.md` for the tag map.
