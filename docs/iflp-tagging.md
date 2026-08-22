# IFLP template tagging

How the IFLP Word template gets filled with form data. Same mechanism as
`fflp.tagged.docx`: docxtemplater replaces `{tags}` in the document with values.

## Two files

| File | Role | Who edits it |
| --- | --- | --- |
| `templates/iflp-template.docx` | **Source.** Highlighted placeholders, no tags. Layout & copy live here. | Hand-edited in Word (design/content) |
| `templates/iflp.tagged.docx` | **Render target.** A copy of the source with each highlight replaced by a `{tag}`. docx-service renders this. | Hand-tagged in Word |

There is **no build script**. You tag by hand in Word — this is deliberate: it
matches how FFLP already works, needs no toolchain, and the repeating-table loops
(below) are far easier to place by hand than to generate.

### Tagging without Word — the unpacked-XML method

When Word isn't available (as in the environment where the FFLP template was tagged),
tags can be inserted **programmatically on the unpacked XML** instead — same end result:

1. A `.docx` is a zip; unzip it and open `word/document.xml`.
2. Replace the sample-text run with the `{tag}`, keeping the tag inside a **single
   `<w:t>` run** — e.g. `<w:r><w:t>60</w:t></w:r>` → `<w:r><w:t>{retirementAge}</w:t></w:r>`.
   If the sample value is split across runs (autocorrect, styling), merge them into one
   run first or docxtemplater won't see the tag.
3. Re-zip via PizZip (the same lib `docx-service` reads with) so no other part changes.
4. Regenerate a report to confirm the value lands.

This is how `templates/fflp.tagged.docx` was tagged (see `docs/fflp-tagging.md`); the
same method works for re-tagging this IFLP template when Word isn't at hand. The
single-run rule below still applies either way.

## Workflow

1. Open `templates/iflp.tagged.docx` in Word.
2. Yellow highlight = a field that still needs a tag. Select the highlighted
   text and replace it with the `{tag}` from the table below. Clear the
   highlight so generated documents aren't yellow.
3. Save. Regenerate a report from the app to confirm the value lands.

The tag text must be **one continuous run** — type it in one go. If Word splits
`{tag}` across runs (e.g. autocorrect), docxtemplater won't see it. Paste as
plain text if unsure.

When the **source** template is revised, propagate the change into the tagged
copy by hand (or re-copy the source and re-tag). For a template that changes ~once
a year this is a minor chore; if it starts changing often, revisit automating it
in Node.

## Tag vocabulary

Tags must exactly match the keys in `buildIflpDocPayload` (`src/lib/iflp-form.ts`).
When a tag has no payload key yet, it renders blank — so only tag a field once its
wizard step feeds the payload, or it will simply come out empty (harmless).

### Done — People & Profile (Step 1)

| Placeholder in template | Replace with | Payload key |
| --- | --- | --- |
| `Month, 2026` (cover) | `{planMonth}, {planYear}` | planMonth, planYear |
| `MONTH 2026` (final-page footer) | `{generationMonth} {generationYear}` | generationMonth, generationYear (render-date, upper-cased; **not** the plan date) |
| `SAMI EL-EID, CFA` (final-page "YOUR RFL PLANNER") | `{advisorName}` | advisorName (generating user's `name` + `, position`, upper-cased) |
| `289-962-2449` (planner block) | `{advisorPhone}` | advisorPhone (generating user's `phone`) |
| `SAMI@RFLWEALTH.CA` (planner block) | `{advisorEmail}` | advisorEmail (generating user's `email`, upper-cased) |
| `Client 1` (cover name) | `{client1Name}` | client1Name |
| `Client 2` (cover name) | `{client2Name}` | client2Name |
| `Dear Client 1, Client 2 & family,` | `{welcomeGreeting}` | welcomeGreeting (computed) |
| `Client & Client` (Profile, Family row) | `{coverClients}` | coverClients (computed) |
| `MPC` (Profile) | `{corporationName}` | corporationName |
| `$00,000` (Profile) | `{householdIncome}` | householdIncome |
| `Retirement, Tax Efficiency, …` (Profile) | `{priorities}` | priorities |
| `Client and Client are …` (intro sentence) | `{clientsClause} in a strong …` | clientsClause (computed) |
| `Family` goal table (Priorities) | wrap the table in `{#hasChildren} … {/hasChildren}`; value cell `Fully fund {childrenNames} post-secondary education` | hasChildren, childrenNames (computed) |

These are already tagged in the committed `iflp.tagged.docx`. Everything else is
still highlighted.

**Notes on recent fixes**

- **Retirement Goal row** (Profile). Its value cell previously read `Age {client1Age}`,
  which rendered the client's *current* age against a "Retirement Goal" label. That
  was wrong. It now renders `{retirementGoal}` — a computed `Age 55` from the Step 2
  target independence age, or `""` when that's unset (so the cell stays blank rather
  than showing a bare "Age "). `client1Age` is no longer referenced by the template.
- **`{clientsClause}`** carries the subject **and** verb of the intro sentence so it
  agrees with the client count: `Dan and Sam are` (two clients) or `Dan is` (one).
  The template owns the rest of the sentence, so keep the leading `{clientsClause}`
  followed by ` in a strong financial position …`.
- **Family education goal.** The whole single-row table is wrapped in a
  `{#hasChildren}` section (open/close tags live in the empty spacer paragraphs that
  bracket the table), so it drops out entirely when the plan has no children.
  `{childrenNames}` renders the possessive list, e.g. `Emma and Liam’s`.

Still-highlighted `Client` / `Client 1` / `Client 2` placeholders remain throughout
the later financial tables (retirement buckets, accounts, insurance, transfers, …).
Those belong to wizard steps 2–6 and are intentionally left untagged until each step
feeds the payload — tagging them now would only render empty values (see the rule at
the top of this section).

### Done — Goals & Success (Step 2)

| Placeholder in template | Replace with | Payload key |
| --- | --- | --- |
| `Create financial independence by age 00` | `… by age {targetIndependenceAge}` | targetIndependenceAge |
| `Age 00` (Profile, Retirement Goal) | `{retirementGoal}` | retirementGoal (computed from target age) |
| `$0,000,000 annually` (Retirement Income) | `{successRetirementIncome}` | successRetirementIncome |
| `$000,000 annually` (Tax-Free Income) | `{successPassiveIncome}` | successPassiveIncome |
| `$0.0M+ available` (Access To Capital) | `{successLiquidCapital}` | successLiquidCapital |
| `$00.0M+` (Estate Value) | `{successNetWorth}` | successNetWorth |

**Retirement Income** and **Tax-Free Income** are entered as an **amount + frequency**
(currency field with a `$` mask, plus a Bi-weekly / Monthly / Annually dropdown that
defaults to Annually). The payload composes them into the cell string, e.g.
`$1,200,000 annually`; an empty amount renders blank. **Access To Capital** and
**Estate Value** stay **free text** (`$5.0M+ available`, `$20.0M+`) — the planner types
the whole phrase. `Education Funding → Fully funded` is static copy, not a field.

**Projected Access To Capital — Table** (Access to Capital section). Fixed rows
`Year 2 / 4 / 6 / 8 / 10`; the year labels are static copy, so only the
"Potential Capital Available" amount cell in each row is tagged (per-cell, like
Retirement Buckets — not a loop):

| Row · placeholder | Replace with | Payload key |
| --- | --- | --- |
| Year 2 · `$000,000` | `{accessCapitalYear2}` | accessCapitalYear2 |
| Year 4 · `$0,000,000` | `{accessCapitalYear4}` | accessCapitalYear4 |
| Year 6 · `$0,000,000` | `{accessCapitalYear6}` | accessCapitalYear6 |
| Year 8 · `$0,000,000` | `{accessCapitalYear8}` | accessCapitalYear8 |
| Year 10 · `$0,000,000` | `{accessCapitalYear10}` | accessCapitalYear10 |

Each cell is a formatted currency amount (`""` when unset, so a blank row renders
empty). Inputs live in the `accessToCapital` slice of `IflpFormState`; entered on
Step 2 under **Projected Access to Capital**. The four `$0,000,000` placeholders
are identical text in separate cells — tag them top-to-bottom by row, not by
find-and-replace.

### Done — Retirement & Savings (Step 3)

Four tables. Two are per-client `{#clients}`-style loops (name reused from Step 1,
second client auto-dropped); two are fixed-row tables with per-cell tags. Every
**Total** is summed in the payload (auto-computed) and blank until a value is
entered, so an empty table never shows "$0".

**Government Benefits (CPP & OAS)** — loop over one row per client:
```
{#governmentBenefits}<cell>{name}</cell> <cell>{cpp}</cell> <cell>{oas}</cell>{/governmentBenefits}
```
Total box → `{governmentBenefitsTotal}`. Figures on `IflpClient` (`cppAmount`, `oasAmount`).

**Income Alignment (Client | Salary)** — loop over one row per client:
```
{#incomeAlignment}<cell>{name}</cell> <cell>{salary}</cell>{/incomeAlignment}
```
Figure on `IflpClient` (`incomeAlignmentSalary`). No total row.

**Retirement Buckets** — fixed rows, per-cell tags. Government has no monthly
contribution (stays `N/A`); "delivers" values carry a `/year` suffix (composed in
the payload):

| Cell | Tag |
| --- | --- |
| Government · delivers | `{bucketGovernmentAnnual}` |
| Personal · monthly / delivers | `{bucketPersonalMonthly}` / `{bucketPersonalAnnual}` |
| Corp Liquid · monthly / delivers | `{bucketCorpLiquidMonthly}` / `{bucketCorpLiquidAnnual}` |
| Corp Fixed · monthly / delivers | `{bucketCorpFixedMonthly}` / `{bucketCorpFixedAnnual}` |
| **Total** · monthly / delivers | `{bucketMonthlyTotal}` / `{bucketAnnualTotal}` |

**Monthly Savings Allocation** — fixed rows: `{monthlySavingsPersonal}`,
`{monthlySavingsCorpLiquid}`, `{monthlySavingsCorpFixed}`, total `{monthlySavingsTotal}`.

Bucket/monthly-savings inputs live in the `retirementBuckets` and `monthlySavings`
slices of `IflpFormState`.

**Projected Annual Retirement Income — Table** (Your Retirement Income Summary).
Three columns: Source | Annual Income | Expected Estate Value. The two per-client
sources are `{#…}` **loops** (name reused from Step 1, second client auto-dropped —
like `governmentBenefits`); the rest are fixed single rows; the annual-income Total
is auto-summed (estate has no total cell).

| Row | Shape | Tags |
| --- | --- | --- |
| CPP & OAS (per client) | loop | `{#riCppOas}CPP & OAS ({name})` / `{income}` / `{estate}{/riCppOas}` |
| TFSA (per client) | loop | `{#riTfsa}TFSA ({name})` / `{income}` / `{estate}{/riTfsa}` |
| Personal Pension Plan | fixed | `{riPppIncome}` / `{riPppEstate}` |
| Corporate Liquid Bucket | fixed | `{riCorpLiquidIncome}` / `{riCorpLiquidEstate}` |
| Corporate Fixed Bucket (Tax-Free) | fixed | `{riCorpFixedIncome}` / `{riCorpFixedEstate}` |
| **Total** | fixed | `{riTotalIncome}` (estate cell stays blank) |

The summary line just below the table — `Total Projected Retirement Income
{riTotalIncome} Per Year` — reuses the **same** `{riTotalIncome}` tag, so it always
matches the table's Total row (no separate payload key).

Inputs live in the `retirementIncome` slice of `IflpFormState` (each source has an
`annualIncome` + `estateValue`); entered on Step 3 under **Projected Annual
Retirement Income**. The per-client rows read `cppOas1`/`tfsa1` for client 1 and
`cppOas2`/`tfsa2` for client 2, and the payload emits one row per *present* client
(no stale figure for a removed client 2). Each amount is `""` when unset.

> The loop open tag must go **inside** the first cell's `<w:t>` run (e.g.
> `<w:t>{#riCppOas}CPP & OAS …`), not loose inside `<w:tr>` — a stray open there
> reads as an "unopened loop" at render time.

### Done — Accounts & Education (Step 4)

Seven tables. Per-client tables are `{#…}` loops (name reused from Step 1, second
client auto-dropped); MPC/metrics are fixed cells; Education is a per-child loop
with an auto-computed total.

| Table | Shape | Tags |
| --- | --- | --- |
| TFSA | per-client loop | `{#tfsa}{name}` / `{contribution}` / `{estimatedValue}{/tfsa}` |
| RRSP | per-client loop | `{#rrsp}` … `{contribution}` / `{estimatedValue}` … `{/rrsp}` |
| PPP | per-client loop | `{#ppp}` … `{/ppp}` |
| Corporate Liquid Bucket | MPC only (single row) | name = `{corporationName}`, `{corpLiquidMonthly}`, `{corpLiquidEstimatedValue}` |
| Corporate Fixed — contributions | per-client loop | `{#corporateFixed}{name}` / `{contribution}{/corporateFixed}` |
| Corporate Fixed — delivers | fixed cells | `{fixedAnnualTaxFreeIncome}`, `{fixedContributionPeriod}`, `{fixedEstateValue}`, `{fixedTotalLifetimeValue}` |
| Education Funding | per-child loop | `{#education}{name}` / `{cost}` / `{years}{/education}`, total `{educationTotal}` |

Per-client account figures live on `IflpClient` (`tfsaContribution`,
`tfsaEstimatedValue`, `rrsp*`, `ppp*`, `corporateFixedContribution`); education
figures on `IflpChild` (`educationCost`, `educationYearsAway`); MPC/metrics in the
`corporateAccounts` slice. The education prose "Providing educational opportunities
for {childrenList} …" reuses the plain child-name list.

The **"Why RESP Alone May Not Be Enough"** sentence ("… help ensure Child 1 and
Child 2 education goals …") now reads `… help ensure {#hasChildren}{childrenNames} {/hasChildren}education goals …`,
reusing the possessive `{childrenNames}` list (e.g. "Emma and Liam’s"). The name and
its trailing space are wrapped in `{#hasChildren}` so a childless plan drops them
cleanly ("… help ensure education goals …") with no orphan text or double space —
no new payload key.

**Known follow-up:** the "for {childrenList}" education-prose sentence still reads
slightly off with zero children (no conditional yet).

### Done — Insurance (Step 5)

Three per-client loop tables, each `name | amount | modifier` where the modifier is
a dropdown value (Term Length / Product / Benefit Term). The modifier renders blank
until an amount is entered.

| Table | Tags |
| --- | --- |
| Term Life | `{#termLife}{name}` / `{amount}` / `{modifier}{/termLife}` |
| Critical Illness | `{#criticalIllness}` … `{/criticalIllness}` |
| Disability | `{#disability}` … `{/disability}` |

Figures on `IflpClient` (`termLifeCoverage`+`termLifeTerm`, `criticalIllness*`,
`disability*`).

### Done — Implementation (Step 6)

Six **dynamic** (add/remove) tables — the planner builds rows, each referencing a
party (client 1 / client 2 / corporation) that the document resolves to a name.
Each template table keeps **one** row as the loop body; the pre-allocated blank
rows were deleted, and the inverted-highlight header rows were un-highlighted.
(A later pass cleared the last stray yellow highlights left on the header cells of
the **Account Transfers – Personal** and **Account Transfers – Corporation**
tables — on the "In-Kind/ In-Cash" and "Expected Time To Receive Funds" columns.)

| Table | Tags |
| --- | --- |
| Account Transfers — Personal / Corporation | `{#transfersPersonal}{party}` / `{institution}` / `{account}` / `{method}` / `{expectedTime}{/transfersPersonal}` (and `…Corporate`) |
| Initial Funding Lump Sum — Personal / Corporation | `{#fundingPersonal}{party}` / `{amount}` / `{bucket}{/fundingPersonal}` (and `…Corporate`) |
| Monthly Contributions — Personal / Corporation | `{#monthlyPersonal}` … `{/monthlyPersonal}` (and `…Corporate`) |

Rows live in the six `IflpFormState` arrays (`transfersPersonal`, …); `party` holds
a PartyKey resolved via `partyName`, and the transfer `method` value (`in_kind`/
`in_cash`) is mapped to a label in the payload.

**All six wizard steps are now built.**

### Remaining sections

Tag names for later sections are added here as each wizard step is built, so the
tag always matches a real payload key. See `docs/iflp-fields.md` for the full
field inventory.

## Repeating tables (later)

The variable-row tables (retirement buckets, accounts, insurance, transfers,
funding, …) are **not** simple tags. docxtemplater repeats a table row with loop
tags placed in the row's cells:

```
{#accounts}  <cell>{party}</cell> <cell>{contribution}</cell> {/accounts}
```

`{#accounts}` opens the loop in the first cell of the template row, `{/accounts}`
closes it in the last; docxtemplater emits one row per array item. This is done
by hand in Word when we build the table steps and needs the payload to provide
arrays, not flat strings.

### The "Client" column reuses Step 1 — parties

Almost every table has a **Client** (or entity) column whose value is `Client 1`,
`Client 2`, or the corporation. Those are **not** re-entered per step — they come
from the parties derived from Step 1 (People & Profile), which is the single source
of truth. `src/lib/iflp-form.ts` exposes the primitive:

| Helper | Use |
| --- | --- |
| `deriveParties(state)` | client 1, client 2 (if entered), corporation (if named) — in order |
| `deriveClients(state)` | clients only, for "one row per client" tables (CPP/OAS, TFSA, term life) |
| `partyOptions(state)` | `{label,value}[]` for the **form's** `SelectInput` — labels are the Step-1 names |
| `partyName(state, key)` | resolve a stored `PartyKey` back to a display name |

The payload carries `clients` and `parties` as **loop-ready arrays**, so a template
row becomes a loop over them and the name is reused automatically:

```
{#clients}<cell>{name}</cell> <cell>{cppAmount}</cell> <cell>{oasAmount}</cell>{/clients}
```

One row per client, each `{name}` filled from Step 1 — and a **solo plan drops the
second row on its own** (the array has one item), which is the table-level version
of "the second client is optional." Use `{#parties}` instead of `{#clients}` for
tables that also row against the corporation (income alignment, funding, transfers).

Later steps attach their own per-row figures (`cppAmount`, `contribution`, …) to
these items as each step is built; until then those loop tags render blank
(harmless), while the reused **names** already work.
