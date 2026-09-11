# IFLP -> FFLP overlap

What the FFLP re-collects that the IFLP already holds, and where each figure's real
source is. Written while wiring the FFLP onto main's IFLP; `docs/fflp-fields.md` is the
per-step field inventory, this file is the reconciliation map.

Counts below are from `FflpFormState` and `buildFflpDocPayload` in `src/lib/fflp-form.ts`.

## Where things stand

The FFLP asks the planner to type **78 fields**. It reads **7 tags** from the IFLP --
`coverClients`, `client1Name`, `client2Name`, `welcomeGreeting`, `advisorName`,
`advisorPhone`, `advisorEmail` -- all arriving through the `...shared` spread of
`buildIflpDocPayload`. Three more come straight off the base state: `coverDate`
(`planMonth` + `planYear`), `retirementAge` (`targetIndependenceAge`), and the child
first names.

Of the 78 typed fields, about **31 already exist in the IFLP**, as entered fields or as
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

**Nothing else in this document can be fixed until the wizard receives the base state.**

## Fields the IFLP already has

| FFLP field(s) | IFLP source | Mismatch |
| --- | --- | --- |
| `govCpp1/2Monthly`, `govOas1/2Monthly` | `IflpClient.cppAmount` / `.oasAmount` | Units |
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

## The one tag collision

`riTotalIncome` is the only key declared in **both** `IflpDocPayload` and
`FflpDocPayload`. `buildFflpDocPayload` spreads `...shared` first and then overrides it,
so the FFLP value wins -- computed from a different set of sources:

- IFLP `retirementIncomeTotal()` = CPP/OAS + TFSA + PPP + Corporate Liquid + Corporate Fixed
- FFLP `totalIncome` = Government + Pension + Corporate + Insurance

Not merely different inputs: different bases. The IFLP counts TFSA and Corporate Fixed;
the FFLP counts Insurance and drops both. Two documents reach the same client with the
same label over two different numbers, and nothing reports the disagreement.

## Structural mismatches

### Units

`iflp-derive.ts` is explicit that CPP and OAS are stored **annual** ("Already annual
figures, so there is no x 12 here"). The FFLP stores the same benefits **monthly** and
multiplies by twelve. Reconciling these means converting, and until then the two forms can
hold the same benefit at a 12x difference with nothing to catch it.

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

### Formatting

The FFLP's local `period()` renders `"1 years"`; the IFLP's `formatYears` renders
`"1 Year"`. It reaches the client-facing document through the insurance contribution
periods and the education horizons.

## Genuinely FFLP-only

Not overlap; leave these alone: `incomeStrategyNote`, `allocInsurance`, `insuranceEstate`,
the insurance block (`insC1*` / `insC2*`, `insTotalReturn`, `insSummaryLine`), the
education wrapper and projection tables (`edu*Wrap*`, `edu*Yr1-5`, `edu*Age30-90`), and
`implNextSteps`.

One that looks like overlap but is not: the IFLP's insurance fields are **protection
products** (term life, critical illness, disability). The FFLP's insurance block is
**insurance as an investment** -- tax-free income, death benefit, total value, return.
Same word, different instrument. The only real link is Step 6's protection toggles.

## A lever worth knowing about

`buildFflpDocPayload` spreads all 93 keys of the IFLP payload into the FFLP payload, of
which the FFLP template currently uses 7. **Any FFLP tag renamed to match its IFLP tag
fills automatically**, with no new wiring -- so a reconciliation is often a template rename
plus deleting a field, rather than new plumbing.

`riTotalIncome` is the same mechanism seen from the other side: spread-then-override gives
free inheritance and silent shadowing from one line of code. When removing an FFLP field,
check whether the tag it leaves behind now resolves to an IFLP value -- that is usually the
goal, but it should be the intended value and not a coincidence.

## Suggested order

1. **Pass `base` into `FflpWizard`.** Nothing else is possible first, and on its own it
   lets the wizard label fields with real client names.
2. **Units and the `riTotalIncome` collision.** These are live correctness bugs producing
   wrong figures today, not merely duplicated effort.
3. **Granularity and shape mismatches.** Duplicated work; wrong only if the two copies
   disagree.
4. **Bucket taxonomy.** A question for RFL before it is a refactor.
