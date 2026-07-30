# IFLP template tagging

How the IFLP Word template gets filled with form data. Same mechanism as
`fflp-template.docx`: docxtemplater replaces `{tags}` in the document with values.

## Two files

| File | Role | Who edits it |
| --- | --- | --- |
| `templates/iflp-template.docx` | **Source.** Highlighted placeholders, no tags. Layout & copy live here. | Hand-edited in Word (design/content) |
| `templates/iflp.tagged.docx` | **Render target.** A copy of the source with each highlight replaced by a `{tag}`. docx-service renders this. | Hand-tagged in Word |

There is **no build script**. You tag by hand in Word — this is deliberate: it
matches how FFLP already works, needs no toolchain, and the repeating-table loops
(below) are far easier to place by hand than to generate.

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
  was wrong, so the value cell is now intentionally **blank** — it's the placeholder
  for a future target-retirement-age field, which the Goals wizard step will collect.
  `client1Age` is therefore not currently referenced by the template (the payload
  still provides it, harmlessly).
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
