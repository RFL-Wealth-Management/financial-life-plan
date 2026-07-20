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
| `Client & Client` (Profile) | `{coverClients}` | coverClients (computed) |
| `MPC` (Profile) | `{corporationName}` | corporationName |
| `Age 00` (Profile) | `Age {client1Age}` | client1Age |
| `$00,000` (Profile) | `{householdIncome}` | householdIncome |
| `Retirement, Tax Efficiency, …` (Profile) | `{priorities}` | priorities |

These nine are already tagged in the committed `iflp.tagged.docx`. Everything
else is still highlighted.

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
