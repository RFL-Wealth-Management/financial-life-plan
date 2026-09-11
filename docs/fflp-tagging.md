# FFLP template tagging

How the FFLP Word template gets filled with data. Same mechanism as the IFLP template:
docxtemplater replaces `{tags}` in `templates/fflp.tagged.docx` with values from
`buildFflpDocPayload` (`src/lib/fflp-form.ts`). The FFLP payload **reuses**
`buildIflpDocPayload` for the shared tags (client names, dates, advisor block) and merges
FFLP-only tags on top.

## Two files

| File | Role |
| --- | --- |
| `template/FFLP Template 2026.docx` | **Source.** Hand-authored, reviewer comments mark editable regions. No tags. |
| `templates/fflp.tagged.docx` | **Render target.** The copy docx-service renders; tags are inserted here. |

## Tagging method — unpacked XML (no Word)

Unlike the IFLP workflow (`docs/iflp-tagging.md`, done by hand in Word), FFLP tags are
inserted **programmatically on the unpacked XML**, because this repo is tagged in an
environment without Word:

1. Unzip the `.docx` (it is a zip) and open `word/document.xml`.
2. Replace the sample-text run with a `{tag}`, keeping the tag inside a **single
   `<w:t>` run** — e.g. `<w:r><w:t>60</w:t></w:r>` → `<w:r><w:t>{retirementAge}</w:t></w:r>`.
   If Word split the sample value across runs, merge them into one run first, or
   docxtemplater won't see the tag.
3. Re-zip (via PizZip, the same lib docx-service uses) so no other part changes.
4. Regenerate a report from the app to confirm the value lands.

Same end result as hand-tagging in Word — just scriptable. This method also works for
re-tagging the IFLP template when Word isn't available.

**Step 2 is not optional, and Word splits runs where you least expect.** The cover's two
name cells were authored as `<w:t>C</w:t>` + `<w:t>lient 1</w:t>` — two runs with different
properties — so they read as "Client 1" in Word and were missed by a find-and-replace for
the whole word. They shipped untagged and the generated cover printed the literal labels
where the clients' names belong. When tagging, search for a *fragment* of the sample text,
not the whole string, and merge the runs before inserting the tag.

### Strip reviewer comments from the render target

The source `FFLP Template 2026.docx` carries 65 Word review comments marking editable
regions. Those are authoring notes and must **not** appear in generated documents, so the
render target `templates/fflp.tagged.docx` has them removed. Stripping a comment cleanly
means removing every related piece, or Word reports a repair:

- in `word/document.xml`: `<w:commentRangeStart>`, `<w:commentRangeEnd>`, and each
  comment-reference run (`<w:r>…<w:commentReference/></w:r>`);
- the parts `word/comments.xml`, `commentsExtended.xml`, `commentsIds.xml`,
  `commentsExtensible.xml`, and `word/people.xml`;
- their entries in `word/_rels/document.xml.rels` and `[Content_Types].xml`.

Keep the render target comment-free; leave the comments in the `template/` source for
reviewers.

## Tag vocabulary

Tags must match the keys `buildFflpDocPayload` emits. An untagged region renders its static
sample text; a tag with no payload key renders **blank** — so only tag a field once its
wizard step feeds the payload.

### Done — Step 1 (Profile & Income Strategy) + shared

| Placeholder in template | Replace with | Payload key |
| --- | --- | --- |
| ~~`{coverClients}` (cover)~~ | **removed** | The cover printed the combined names and then the per-client name table directly below, showing both clients twice. The combined line is gone; the payload still supplies `coverClients` (it is a `SharedTag`), so re-adding the tag would work. |
| `{client1Name}` / `{client2Name}` | *already tagged* | client1Name / client2Name (shared) |
| `Client 1` / `Client 2` (cover name table) | `{client1Name}` / `{client2Name}` | client1Name / client2Name (shared) |
| `{welcomeGreeting}` (CEO welcome) | *already tagged* | welcomeGreeting (shared) |
| `MAY 2026` (cover + final page) | `{coverDate}` | coverDate (plan month + year, upper-cased) |
| `60` (Profile · Retirement Age) | `{retirementAge}` | retirementAge (shared; the base plan's `targetIndependenceAge`) |
| `$250,000` (Income Strategy · Recommended Structure) | `{recommendedSalary}` | recommendedSalary (**new**; formatted currency) |
| `SAMI EL-EID, CFA` (final page planner) | `{advisorName}` | advisorName (shared) |
| `289-962-2449` (planner block) | `{advisorPhone}` | advisorPhone (shared) |
| `SAMI@RFLWEALTH.CA` (planner block) | `{advisorEmail}` | advisorEmail (shared) |

### Done — Steps 2–3 (Contributions, Buckets & Income)

Tagged by paragraph index (many values repeat, so string-replace isn't safe — see
the indexed tagger note below). Most totals are **derived** in `buildFflpDocPayload`,
so only leaf figures are stored in `FflpFormState`.

| Section | Tags |
| --- | --- |
| Monthly Contributions & Allocation | `{contribTotal}` (derived), `{allocPersonal}`, `{allocCorporate}`, `{allocInsurance}` |
| Retirement Buckets — At a Glance | `{bucketsTotalIncome}`, `{bucketGovAnnual}`, `{bucketPensionMonthly}`, `{bucketPensionAnnual}`, `{bucketCorpMonthly}`, `{bucketCorpAnnual}`, `{bucketInsuranceMonthly}`, `{bucketInsuranceAnnual}` (all derived) |
| Government Bucket | per client `{govCpp1Monthly}`/`{govCpp1Annual}` … `{govOas2Annual}` + `{govTotalMonthly}`/`{govTotalAnnual}`. **No FFLP fields feed these** — CPP/OAS are read off the base plan's clients, where they are stored annual, and the monthly column is derived (`monthlyFromAnnual`). The total is `governmentBenefitsTotal(base)`. See `docs/fflp-iflp-overlap.md`. |
| Pension Bucket (PPP) | `{pension1Monthly}`/`{pension1Annual}` … + `{pensionTotalMonthly}`/`{pensionTotalAnnual}` |
| Corporate Bucket | `{corpMonthly}`, `{corpAnnual}` |
| Retirement Income Summary | `{riEstimatedAnnual}`, `{riGovIncome}`/`{riGovEstate}` … `{riTotalIncome}`/`{riTotalEstate}` (income derived from buckets; gov/pension estate = $0) |

**Indexed tagging.** Because the FFLP body repeats many identical figures, cells are
tagged by their **paragraph index** (from the text dump) rather than by find-and-replace,
and each tag is verified back by re-dumping. FFLP-only data is stored as one JSONB blob
(`plan_fflp.data`), so new fields don't need a migration.

### Done — Steps 4–5 (Insurance & Capital, Education)

| Section | Tags |
| --- | --- |
| Insurance — Contributions & Outcomes | per client `{insC1Monthly}`/`{insC1Period}`/`{insC1TaxFreeAnnual}` … + `{insTotalMonthly}`/`{insTotalTaxFreeAnnual}` + `{insSummaryLine}` |
| Insurance — Detailed Outcome | per client `{insC1Duration}` (text), `{insC1TotalTaxFree}`/`{insC1DeathBenefit}`/`{insC1TotalValue}` (numbers → abbreviated `$8.431M`), `{insC1Return}` (text). Totals `{insTotalTaxFree}`/`{insTotalDeathBenefit}`/`{insTotalValue}` are **derived** (summed); `{insTotalReturn}` is free text (a blended ratio, not a sum) |
| Access to Capital | `{ac2C1}`/`{ac2C2}`/`{ac2Total}` … `{ac10Total}` (totals derived); the two column headers reuse `{client1Name}`/`{client2Name}` |
| Education | child names `{eduChild1Name}`/`{eduChild2Name}` (from the IFLP), plus `{edu1Target}`/`{edu1Horizon}`, `{edu1Wrap*}`, `{edu1Yr1..5}`, `{edu1Age30..90}` (and `edu2*`) |

Insurance monthly/annual **totals** are derived from the per-client figures and feed the
Retirement Buckets "at a glance" and the Income Summary — entered once, shown everywhere.

### Done — Step 6 (Implementation & Protection)

Three tables became docxtemplater **loops** — the sample rows were reduced to header + one
body row, and the body cells wrapped so each repeats per array item:

| Table | Loop |
| --- | --- |
| Transfers & Lump Sum | `{#implTransfers}{account}` / `{action}` / `{amount}` / `{destination}{/implTransfers}` |
| Ongoing Monthly Contributions | `{#implMonthly}{source}` / `{amount}` / `{allocatedTo}{/implMonthly}` |
| Next Steps | `{#implNextSteps}{action}` / `{status}` / `{owner}{/implNextSteps}` |

**Protection Planning** uses two boolean toggles, each driving a pair of conditional blocks;
the "IF …:" instruction labels were turned into the section tags and removed:

- Critical Illness: `{#ciInPlace}…{/ciInPlace}` (in place) and `{^ciInPlace}…{/ciInPlace}`
  (inverted = not in place).
- Disability: `{#diNewCoverage}…{/diNewCoverage}` (new coverage) and
  `{^diNewCoverage}…{/diNewCoverage}` (inverted = coverage exists elsewhere).

Section tags were placed by paragraph id: the label paragraph becomes the open tag (a
tag-only paragraph docxtemplater drops), and the close tag is appended to the last paragraph
of each block. **Priorities & Progress** and **Expected Net Worth** remain static prose.

**All six FFLP steps are now wired.** See `docs/fflp-fields.md` for the full field inventory
and `docs/iflp-tagging.md` for the loop/conditional conventions, which apply identically here.
