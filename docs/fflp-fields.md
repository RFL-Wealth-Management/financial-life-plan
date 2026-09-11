# FFLP field inventory

The **FFLP** (fully-implemented Financial Life Plan) is the document a client graduates to
after the **IFLP** (Initial Financial Life Plan). It **reuses the IFLP plan as its base**
(same clients, corporation, buckets, advisor block) and adds deeper, implementation-stage
detail on top. Source template: `template/FFLP Template 2026.docx`; render target:
`templates/fflp.tagged.docx`.

There is no highlight-based extraction for FFLP (the source has reviewer *comments*, not
highlights — see `docs/iflp-fields.md` "Why FFLP is missing"). This inventory is
reconstructed from the template body and grouped into the FFLP wizard's steps.

- **Shared** = already collected by the IFLP wizard and stored on the plan. FFLP reads it
  from the base plan (`loadPlanState`) — it is **not** re-entered in the FFLP form.
- **New** = FFLP-only. Collected by the FFLP wizard (`src/lib/fflp-form.ts`) and stored in
  the `plan_fflp` tables (see `supabase/migrations/20260818000000_fflp_extend.sql`).

## Steps

All six steps render real fields and feed `buildFflpDocPayload`. Each one is listed
below with the state it owns; `src/lib/fflp-form.ts` is the authority, and
`docs/fflp-tagging.md` maps each field to its tag.

Most totals are **derived** in the payload builder rather than stored, so a figure is
entered once and shown everywhere it appears. Only leaf values live in `FflpFormState`.

### Step 1 - Profile & Income Strategy

| Field | Kind | Source / notes |
| --- | --- | --- |
| Cover client names, cover date | Shared | `{coverClients}`, `{client1Name}`, `{client2Name}`, `{coverDate}` |
| CEO welcome | Static | "A Welcome From Our CEO" / "Saad Nadeem, CEO" - static template copy, not a field |
| Retirement Age | Shared | Profile row. Sourced from the plan's `targetIndependenceAge` - not re-entered |
| **Recommended Salary** | **New** | Income Strategy -> Recommended Structure. `recommendedSalary` |
| Income strategy note | New | `incomeStrategyNote` |
| Advisor block | Shared | Final page: `{advisorName}`, `{advisorPhone}`, `{advisorEmail}` (the generating user) |

### Step 2 - Contributions & Allocation

New: `allocPersonal`, `allocCorporate`, `allocInsurance`. The total is derived as their
sum, so it is never stored.

### Step 3 - Buckets & Income

New: Government per-person CPP/OAS monthly (`govCpp1Monthly` ... `govOas2Monthly`; annual
is monthly x 12, totals summed); Pension/PPP monthly + annual per client; Corporate Liquid
monthly + annual; per-bucket estate values for the income summary (`corpEstate`,
`insuranceEstate` - government and pension estate are $0 by definition).

### Step 4 - Insurance & Access to Capital

New: per-client contributions and outcomes (`insC1Monthly`, `insC1PeriodYears`,
`insC1TaxFreeAnnual`, and the same for client 2); detailed outcome figures
(`insC1Duration`, `insC1TotalTaxFree`, `insC1DeathBenefit`, `insC1TotalValue`,
`insC1Return`); `insTotalReturn` and `insSummaryLine`. Access to Capital per client at
years 2/4/6/8/10 (`ac2C1` ... `ac10C2`).

Monetary insurance totals are summed in the payload. `insTotalReturn` is **not** - it is a
blended ratio rather than a sum, so it stays hand-entered.

### Step 5 - Net Worth & Education

New, per child (up to two, names read from the IFLP's children): funding target and
horizon; insurance-wrapper annual contribution and duration; end-of-year 1-5 values; and
age 30/40/50/65/90 milestones.

### Step 6 - Implementation & Protection

New: three dynamic add/remove tables - `implTransfers`, `implMonthly`, `implNextSteps` -
which render as docxtemplater loops. Protection Planning is two booleans, `ciInPlace` and
`diNewCoverage`, each selecting one of a mutually exclusive pair of template blocks.

## Fields the IFLP now owns

The FFLP form was designed against a much thinner IFLP. Main has since grown dynamic
accounts, `iflp-derive.ts`, plan-level option switches and derived monthly contributions,
and roughly 31 of the 78 figures the FFLP collects now exist in the base plan already --
some as entered fields, some as `iflp-derive` selectors.

**See `docs/fflp-iflp-overlap.md`** for the field-by-field map, the unit and granularity
mismatches, and the `riTotalIncome` tag collision. That file is the one to keep current;
this section is a pointer, not a second copy.

Until these are reconciled, the same number can be entered twice and disagree between the
two documents - the exact problem the IFLP's own derived-figure consolidation removed.
Treat the IFLP as the source of truth when resolving a disagreement.

## Relationship to the database

One FFLP per plan. "An FFLP exists for this plan" == a `plan_fflp` row exists. FFLP-only
scalar fields live on `plan_fflp` (1:1 with `plans`); FFLP-only repeating data goes in
`plan_fflp_*` child tables added as their steps are built. See the migration and
`docs/fflp-tagging.md` for the tag map.
