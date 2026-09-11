# IFLP -> FFLP overlap

What the FFLP re-collects that the IFLP already holds, and where each figure's real
source is. Written while wiring the FFLP onto main's IFLP; `docs/fflp-fields.md` is the
per-step field inventory, this file is the reconciliation map.

Counts below are from `FflpFormState` and `buildFflpDocPayload` in `src/lib/fflp-form.ts`.

## Where things stand

The FFLP asks the planner to type **74 fields** (78 before the Government bucket was
derived away). It reads **7 tags** from the IFLP --
`coverClients`, `client1Name`, `client2Name`, `welcomeGreeting`, `advisorName`,
`advisorPhone`, `advisorEmail` -- all arriving through the `...shared` spread of
`buildIflpDocPayload`. Three more come straight off the base state: `coverDate`
(`planMonth` + `planYear`), `retirementAge` (`targetIndependenceAge`), and the child
first names.

Of the 74 still typed, about **27 already exist in the IFLP**, as entered fields or as
`iflp-derive` selectors.

## The blocker: the wizard cannot see the plan

`src/app/(app)/reports/[id]/fflp/page.tsx` loads the whole base plan and passes one
string of it to the wizard:

```tsx
const base = await loadPlanState(supabase, id);
<FflpWizard planId={id} initialState={fflp} clientLastName={base.client1.lastName} />
```

`clientLastName` is used for the download filename and nothing else. The base plan is
available again at generate time in `src/app/api/generate/fflp/route.ts`, but the wizard
itself has no access to it -- so it cannot pre-fill a field, show what the IFLP already
says, or even label a row with a client's name. That is why every per-client input reads
a flat "Client 1" / "Client 2".

**Resolved.** `FflpWizard` now takes the base state as a required prop, and uses it to
label its columns with the plan's own names and to drop the second column on a solo plan.

## Fields the IFLP already has

| FFLP field(s) | IFLP source | Mismatch |
| --- | --- | --- |
| ~~`govCpp1/2Monthly`, `govOas1/2Monthly`~~ | `IflpClient.cppAmount` / `.oasAmount` | **Done** -- derived |
| `allocPersonal` | `personalSavingsMonthly()` | none |
| `allocCorporate` | `monthlySavingsCorpLiquid()` + `monthlySavingsCorpFixed()` | none (sum of two) |
| `corpMonthly` | `monthlySavingsCorpLiquid()` | none |
| `corpAnnual` | `corporateLiquidIncome()` | none |
| `corpEstate` | `retirementIncome.corporateLiquid.estateValue` | none |
| `pension1/2Monthly` | `accountsOfKind(state, "ppp")` -> `monthlyContribution` | none; accounts carry `party` |
| `pension1/2Annual` | `retirementIncome.personalPension.annualIncome` | Granularity |
| `ac2C1` ... `ac10C2` | `accessToCapital.year2` ... `year10` | Granularity |
| `edu1/2Target` | `IflpChild.educationCost` | none |
| `edu1/2Horizon` | `IflpChild.educationYearsAway` | none; formatting differs |
| `implTransfers` | `transfersPersonal` + `transfersCorporate` | Shape |
| `implMonthly` | `monthlyPersonal` + `monthlyCorporate` | Shape |
| `ciInPlace`, `diNewCoverage` | `criticalIllnessCoverage` / `disabilityMonthlyBenefit` presence | derivable as booleans |
| `recommendedSalary` | `incomeAlignmentAmount` + `incomeStructure` | Meaning |

## The tag collision -- resolved

`riTotalIncome` was the only key declared in **both** `IflpDocPayload` and
`FflpDocPayload`. `buildFflpDocPayload` spread `...shared` and then overrode it, so which
value reached the document was decided by which line came last in an object literal.

The FFLP's value was the correct one for the FFLP's table, so this was not printing a wrong
figure -- it was a trap. Deleting the FFLP's line, for any reason, would have silently
started rendering the IFLP's total under the same tag, and nothing in the types or the
template would have said so.

`FflpDocPayload` now extends `Pick<IflpDocPayload, SharedTag>` instead of the whole
payload, and the builder writes out the seven shared tags rather than spreading ninety-odd.
A key can no longer cross over by accident; adding a name to `SharedTag` is how a value
becomes shared, and the compiler then requires it.

What the two totals *mean* still differs, and that is the taxonomy question below rather
than a bug:

- IFLP `retirementIncomeTotal()` = CPP/OAS + TFSA + PPP + Corporate Liquid + Corporate Fixed
- FFLP `totalIncome` = Government + Pension + Corporate + Insurance

## Structural mismatches

### Units -- resolved

`iflp-derive.ts` is explicit that CPP and OAS are stored **annual** ("Already annual
figures, so there is no x 12 here"). The FFLP used to store the same benefits **monthly**
and multiply by twelve, so the same benefit could sit in the two forms a factor of twelve
apart with nothing to catch it -- and a planner copying an annual figure from the IFLP into
a monthly field produced exactly that.

The four fields are gone. `buildFflpDocPayload` reads CPP and OAS off the base plan's
clients and derives the monthly column with `monthlyFromAnnual`, the inverse of
`annualFromMonthly` and living beside it so the x12 constant stays in one module. The
bucket total is `governmentBenefitsTotal(base)` -- the IFLP's own selector -- so the two
documents cannot report different government income. The wizard shows the figures read-only
with a "from the IFLP" hint.

### Bucket taxonomy

The two documents do not model retirement income the same way:

| IFLP buckets | FFLP buckets |
| --- | --- |
| Government | Government |
| Personal Savings | Pension |
| Corporate Liquid | Corporate |
| Corporate Fixed | Insurance |

Only Government is common to both. This is the deepest difference here and it is not a
field mapping -- it is two models of the same plan. Worth confirming with RFL whether the
FFLP's four buckets are a deliberate re-framing for the implementation stage before any
code treats one as derivable from the other.

### Cardinality

The FFLP hardcodes exactly two clients and two children. The IFLP has `namedClients()` and
an unbounded `children[]`. On a solo plan the FFLP still asks for Client 2's figures and
will print whatever is entered.

### Formatting -- resolved

The FFLP's local `period()` rendered `"1 years"`. It now renders `"1 year"`, staying
lower-case (unlike `format.ts`'s `formatYears`) to match the template's surrounding copy.

## Genuinely FFLP-only

Not overlap; leave these alone: `incomeStrategyNote`, `allocInsurance`, `insuranceEstate`,
the insurance block (`insC1*` / `insC2*`, `insTotalReturn`, `insSummaryLine`), the
education wrapper and projection tables (`edu*Wrap*`, `edu*Yr1-5`, `edu*Age30-90`), and
`implNextSteps`.

One that looks like overlap but is not: the IFLP's insurance fields are **protection
products** (term life, critical illness, disability). The FFLP's insurance block is
**insurance as an investment** -- tax-free income, death benefit, total value, return.
Same word, different instrument. The only real link is Step 6's protection toggles.

## How a value becomes shared

Until the collision above was fixed, `buildFflpDocPayload` spread all 93 IFLP keys in and
the FFLP template used 7 of them. That made renaming an FFLP tag to match an IFLP tag fill
it automatically -- convenient, and the same mechanism that let `riTotalIncome` shadow
silently. Convenience and hazard were one line of code.

Sharing is now explicit: add the tag name to `SharedTag` in `src/lib/fflp-form.ts` and
assign it in `shared`. One extra line per shared value, and nothing crosses over that
nobody chose.

When removing an FFLP field, check what its tag now resolves to. It renders blank unless
something supplies it -- which is usually what you want while a section is mid-migration,
but it is worth knowing it fails quietly rather than loudly.

## Suggested order

1. ~~**Pass `base` into `FflpWizard`.**~~ Done. Also drops the second client/child column
   on a plan that has no second person.
2. ~~**Units and the `riTotalIncome` collision.**~~ Done. Government is derived from the
   base plan; sharing is explicit rather than a blanket spread.
3. **Granularity and shape mismatches.** Duplicated work; wrong only if the two copies
   disagree. The clean one-to-one mappings -- `allocPersonal`, `allocCorporate`,
   `corpMonthly`, `corpAnnual`, `corpEstate`, pension monthly, education target and horizon
   -- can follow the Government bucket's pattern directly.
4. **Bucket taxonomy.** A question for RFL before it is a refactor.
