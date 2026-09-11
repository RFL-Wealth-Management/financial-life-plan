# IFLP — Field Inventory

Every input the form must collect to produce the **IFLP** document.

**Source:** `templates/iflp-template.docx` (306 highlight tags, as of 2026-07-16)
**Method:** every yellow-highlighted run in `word/document.xml`, extracted
programmatically. Highlighting is the template's marker for "planner fills this in".

FFLP is **not** covered here — the FFLP template has no highlighting at all.
See [Why FFLP is missing](#why-fflp-is-missing).

---

## How to read this

`Input` names the Storybook component in `src/components/fields/`:
`TextInput`, `NumberInput`, `CurrencyInput`, `SelectInput`, `MonthYearPicker`.

**Scope — v1.0.1:** every fixed list is a plain dropdown, closed set, no `Other`
escape hatch. If a planner needs a value outside the list, that is a follow-up.

| Marker | Meaning |
| --- | --- |
| **Table** | Field lives in a table row. No table component exists yet — deferred. Assume add/remove-row support unless noted. |
| *Derived* | Not collected. Computed from another field, usually a name echoed into prose. |
| *Computed* | Not collected. Calculated in the form from the rows above it. |
| ⚠️ | Needs a template fix or a decision. |

**306 highlights is not 306 fields.** Most repeat: `Client 1`'s name is
highlighted 20+ times because it recurs throughout the document. The distinct
count is **~60**, of which **~45 sit inside tables**.

### The template's highlighting convention

In a table, the **header row is plain and the data rows are highlighted**:

```
row0             Insured  | Coverage Amount | Term Length      ← plain
row1  *Client 1  | *$3,000,000  | *30 Years                    ← highlighted
```

Two tables violate this — see [Template fixes needed](#template-fixes-needed).

---

## 1. Cover & document metadata

| Field | Placeholder | Input | Notes |
| --- | --- | --- | --- |
| Plan month & year | `Month, 2026` | `MonthYearPicker` | Also in the page footer (`MONTH 2026`) — one value, rendered twice |
| Client 1 first / last name | `Client 1` | `TextInput` ×2 | |
| Client 2 first / last name | `Client 2` | `TextInput` ×2 | Optional — single-client plans exist |
| Cover client line | `Client & Client` | *Derived* | `"{c1} & {c2}"`, or just `{c1}` when solo |
| Letter greeting | `Dear Client 1, Client 2 & family,` | *Derived* | Drop `Client 2` when solo |

## 2. Profile

| Field | Placeholder | Input | Notes |
| --- | --- | --- | --- |
| Corporation name | `MPC` | `TextInput` | Recurs in every corporate section |
| Client 1 age | `Age 00` | `NumberInput` | Required |
| Client 2 age | — | `NumberInput` | **Optional.** Not highlighted in the template, but required by the data model |
| Household income | `$00,000` | `CurrencyInput` | |
| Priorities | `Retirement, Tax Efficiency, Education, Protection` | `TagInput` | Multi-select. Options render below the field; clicking one adds it as a tag. Feeds the Profile summary line only |
| Other priorities | — | `TextInput` ×2, add/remove rows | **Priority** + **Desired outcome**, because that's what the document's Priorities table needs to build a row. Name required; blank outcome renders an empty cell |
| Profile narrative names | `Client and Client are in a strong…` | *Derived* | |

## 3. Your Priorities

| Field | Placeholder | Input |
| --- | --- | --- |
| Target independence age | `by age 00` | `NumberInput` |
| Child 1 first / last name | `Child` | `TextInput` ×2 |
| Child 2 first / last name | `Child's` | `TextInput` ×2 |

Possessive (`Child's`) is rendered, not stored. The possessive and prose lists
use first names only (`Emma and Liam's`); the Profile `{children}` line uses the
full name with age (`Emma Chen (10), Liam Chen (7)`).

## 4. What Success Looks Like

**Nothing here is entered.** All four figures are derived from later steps, so the
section is read-only — the planner fills steps 3 and 4 and this table fills
itself. The template's fifth row, `Education Funding | Fully funded`, is fixed
copy with no tag.

| Row (template label) | Source | Payload key |
| --- | --- | --- |
| Retirement Income | Step 3 · Projected Annual Retirement Income total | `successRetirementIncome` |
| Tax-Free Income | Step 4 · Corporate Fixed Bucket → Annual Tax-Free Income | `successPassiveIncome` |
| Access To Capital | Projected Access to Capital → Year 10 | `successLiquidCapital` |
| Estate Value | Step 4 · Corporate Fixed Bucket → Estate Value | `successNetWorth` |

The payload keys keep their legacy names (`successPassiveIncome`,
`successLiquidCapital`, `successNetWorth`) because they are the `{tags}` already
typed into `iflp.tagged.docx` — renaming them would mean re-tagging the template
by hand for no gain. The row labels above are what the document actually says.

These used to be planner-entered: the top two as an amount plus a frequency
adverb ("$1,200,000 annually"), the bottom two as free-text prose ("$5.0M+
available", "$20.0M+"). Deriving them means they now render as exact currency.
`plans.success_*` still stores the rendered strings, but only as a snapshot of
what a given document printed — nothing reads them back.

### Projected Access to Capital — **Table**

Fixed year rows (`Year 2 / 4 / 6 / 8 / 10`); labels are static, only the amount is
entered. Stored in the `accessToCapital` slice.

| Field | Placeholder | Input |
| --- | --- | --- |
| Potential capital available × 5 | `$000,000` / `$0,000,000` | `CurrencyInput` |

### Projected Annual Retirement Income — **Table**

Source rows with an annual income and an expected estate value each. CPP & OAS and
TFSA are per-client (row per client, second dropped for a solo plan); PPP and the
corporate buckets are single rows; the annual-income Total is *computed*. Stored in
the `retirementIncome` slice. Entered on Step 3.

| Field | Input |
| --- | --- |
| Annual income × 7 sources | `CurrencyInput` |
| Expected estate value × 7 sources | `CurrencyInput` |
| Total annual income | *Computed* |

## 5. Retirement Buckets — **Table**

Five bucket rows. Each row: a contribution and an annual figure (`$00,000/year`).

| Field | Input |
| --- | --- |
| Bucket contribution × 5 | `CurrencyInput` |
| Bucket annual value × 5 | `CurrencyInput` |
| Total | *Computed* |

## 6. Income Alignment Strategy — **Table**

| Field | Input | Notes |
| --- | --- | --- |
| Client (per row) | *Derived* | One row per named client, from step 1 |
| Income structure (per row) | `SelectInput` | **Salary** or **Dividends** — per client, not per plan |
| Amount (per row) | `CurrencyInput` | Whichever structure the client draws; label follows the choice |

Salary and dividends are alternatives, not a split, so there is one amount field
per client. The choice drives the section's copy in the document — see the
Income Alignment table in [iflp-tagging.md](iflp-tagging.md).

## 7. Monthly Savings Allocation — **Table**

Four currency cells (`$0,000`, `$00,000`, `$00,800`, `$00,000`). Total is
*computed*.

## 8. Government Retirement Benefits (CPP & OAS) — **Table**

| Field | Input | Notes |
| --- | --- | --- |
| Client | `SelectInput` | One row per client |
| CPP amount | `CurrencyInput` | |
| OAS amount | `CurrencyInput` | |

## 9. Accounts — **Add / remove**

Accounts are **optional and repeatable**. The planner adds the ones a plan holds;
an account that was never added has no rows and no page in the document. There is
no separate "include this account" switch — adding *is* including.

The same kind can appear more than once (two clients each holding a TFSA, one
client holding two at different institutions). The document's account tables were
already docxtemplater loops, so extra rows print with no template change.

| Field | Input | Notes |
| --- | --- | --- |
| Client / Entity | `SelectInput` | Parties filtered by the kind's `holder` |
| Monthly Contribution | `CurrencyInput` | The only contribution figure stored |
| Annual Contribution | `DerivedCurrency` | Read-only, 12 × monthly |
| Estimated Value | `CurrencyInput` | Only for kinds with `hasEstimatedValue` |
| Annual Income in Retirement | `CurrencyInput` | Only for kinds with `hasRetirementIncome` |

`ACCOUNT_KINDS` in `iflp-form.ts` is the single definition of what each kind looks
like — who holds it, which fields it shows, and whether it counts toward Personal
Savings. Adding a new account type is a row there plus an `account_type` enum
value, not a new branch in five files.

| Kind | Holder | Estimated value | Personal savings | Retirement income |
| --- | --- | --- | --- | --- |
| TFSA | Client | yes | yes | — |
| RRSP | Client | yes | yes | — |
| FHSA | Client | yes | yes | — |
| Non-Registered | Client | yes | yes | — |
| PPP | Client | yes | — | — |
| Corporate Liquid Bucket | Corporation | "Estimated Value at Retirement" | — | yes |
| Corporate Fixed Bucket | Client | **no** | — | — |

### Personal Savings Summary — **Table**

One row per personal account (monthly + derived annual) and a computed total.
Renders only when at least one personal account has been added.

### Corporate Fixed Bucket — What It Delivers

Plan-level figures, not tied to a contribution, so they stay on
`CorporateAccountsInput`: Annual Tax-Free Income, Contribution Period, Estate
Value, Total Lifetime Value.

## 10. Education funding — **Table**

| Field | Input | Notes |
| --- | --- | --- |
| Child name | `TextInput` | Rows for `Child 1`, `Child 2` |
| Education cost | `CurrencyInput` | Highlighted as a bare `$` |
| Years away | `NumberInput` | `0 Years` |
| Total | *Computed* | |
| Narrative names | *Derived* | `Child1`/`Child2` echoed into two prose paragraphs |

## 11. Term Life Insurance — **Table**

| Field | Placeholder | Input |
| --- | --- | --- |
| Insured | `Client 1`, `Client 2` | `SelectInput` |
| Coverage amount | `$3,000,000` | `CurrencyInput` |
| Term length | `30 Years` | `SelectInput` |

## 12. Critical Illness Insurance — **Table**

| Field | Placeholder | Input |
| --- | --- | --- |
| Client | | `SelectInput` |
| Coverage | `$000,000` | `CurrencyInput` |
| Product | `Living Benefit 75` | `SelectInput` |

## 13. Disability Insurance — **Table**

| Field | Placeholder | Input |
| --- | --- | --- |
| Client | | `SelectInput` |
| Monthly benefit | `$0,000` | `CurrencyInput` |
| Benefit term | `To Age 65` | `SelectInput` |

## 14. Implementation Roadmap — **Table** ×2

`Account Transfers – Personal` and `Account Transfers – Corporation`, identical
shape. The template pre-allocates **10 rows** (one sample plus 8 blanks), but
that is Word padding — the form uses add/remove rows.

| Field | Input | Notes |
| --- | --- | --- |
| Client | `SelectInput` | |
| Institution | `TextInput` | Free text — institution names are open-ended |
| Account | `SelectInput` | Dropdown |
| In-Kind / In-Cash | `SelectInput` | Dropdown — two options |
| Expected time to receive funds | `TextInput` | Free text (`2-4 weeks`) |

⚠️ Highlighting is inverted here — see [Template fixes needed](#template-fixes-needed).

## 15. Initial Funding — Lump Sum — **Table** ×2

Personal (`Client 1`, `$500`, `TFSA`) and Corporation (`MPC`, `$500`,
`Corporate Liquid Bucket`).

| Field | Input |
| --- | --- |
| Client / entity | `SelectInput` |
| Amount | `CurrencyInput` |
| Funding bucket | `SelectInput` |

## 16. Ongoing Monthly Contributions — **Table** ×2

Personal and Corporation. Pre-allocated **4 rows**: one sample plus 2 blanks.

| Field | Input |
| --- | --- |
| Client / entity | `SelectInput` |
| Contribution amount | `CurrencyInput` |
| Funding bucket | `SelectInput` |

⚠️ Highlighting is inverted here too.

## 17. Advisor block

**Not form fields — fixed config for now.** A future admin section will edit them.

| Field | Placeholder |
| --- | --- |
| Advisor name | `SAMI EL-EID, CFA` |
| Advisor phone | `289-962-2449` |
| Advisor email | `SAMI@RFLWEALTH.CA` |

---

## Sections with no highlighted fields

Static: *Your Dedicated Team*, *Recommendation*, *Next Steps*, *Your Partnership
With RFL*, *Recognition & Appreciation*.

---

## Template fixes needed

**Account Transfers** (×2) and **Monthly Contributions** (×2) have their
highlighting on the **header row** instead of the data row — the exact inverse of
every other table:

```
row0  *Client | *Institution | *Account | *In-Kind/In-Cash | *Expected Time   ← highlighted
row1   Client 1 |  CIBC |  TFSA |  Cash |  2-4 weeks                          ← plain
row2   (blank) …
```

Compare Term Life, which follows the convention correctly. The column headers are
almost certainly not editable, so these four tables should be re-highlighted on
their data rows. The field lists in §14/§16 above assume that intent.

---

## Open questions

1. **Fixed-list contents.** Every `SelectInput` above needs its actual option
   list — the template only shows one example value each. Known so far:
   In-Kind/In-Cash is `In-Kind` / `In-Cash`. Still needed: Account types,
   funding buckets, critical illness products, benefit terms, term lengths.
2. **Row counts per table.** Add/remove is the default. Any table that should be
   capped (Retirement Buckets is fixed at 5; CPP/TFSA/RRSP/PPP are one row per
   client and bounded by client count) needs saying so.

---

## Why FFLP is missing

The method that produced this document does not work on FFLP.
`template/FFLP Template 2026.docx` contains **zero highlighted runs**. Its
editable regions are instead marked with **65 Word comments** from two reviewers,
which mix field notes (*"prompt to enter the month and year"*, *"editable field.
the numerical value will have to be edited"*) with design discussion (*"Fonts:
Headings: Lora"*, *"Can we include bullet points for this"*) and status notes
(*"stays the same"*, *"left blank"*).

Those comments are a conversation, not a specification. Options:

- Highlight the FFLP template the way IFLP is highlighted, then re-run the
  extraction. Cleanest, and keeps one method for both documents.
- Walk the 65 comments together and decide field-by-field.
