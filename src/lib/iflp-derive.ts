// Derived figures for the IFLP — the single source of truth for every number
// the planner does not type.
//
// Why this module exists: nearly every total in the plan is needed twice, once
// by the wizard (to show the planner) and once by `buildIflpDocPayload` (to
// print in the document). Computing them in both places is how the two came to
// disagree. Every selector here returns `number | null`; the caller formats it —
// `moneyOrDash` for the wizard, `moneyOrBlank` for the document.
//
// RULE: this module imports from `iflp-form.ts` with `import type` ONLY, so the
// dependency is erased at compile time and the two modules can reference each
// other freely. If you ever need a runtime value from `iflp-form.ts` here, move
// that value into this module or into `format.ts` instead — do not add a runtime
// import, or you create a real cycle.
//
// `null` means "no figure entered", and propagates: a total of all-null inputs
// is null, not 0, so blank tables read as blank rather than as a plan with zero
// dollars in it.

import { sumOrNull } from "@/lib/format";
import type {
  IflpClient,
  IflpFormState,
  RetirementIncomeInput,
} from "@/lib/iflp-form";

// ---------------------------------------------------------------------------
// Local copies of the two party predicates. These duplicate `hasClient` /
// `clientRecords` in iflp-form.ts by design — importing them would need a
// runtime import and break the type-only rule above. They are four lines and
// the definition of "a client is present" is stable.
// ---------------------------------------------------------------------------

function hasClient(c: IflpClient): boolean {
  return Boolean(c.firstName.trim() || c.lastName.trim());
}

/** The named clients, client 1 first. Same inclusion rule as `deriveClients`. */
export function namedClients(state: IflpFormState): IflpClient[] {
  return [state.client1, state.client2].filter(hasClient);
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

/**
 * Total projected government retirement income — every named client's CPP plus
 * OAS. Already annual figures, so there is no × 12 here (unlike every other
 * bucket contribution).
 */
export function governmentBenefitsTotal(state: IflpFormState): number | null {
  return sumOrNull(namedClients(state).flatMap((c) => [c.cppAmount, c.oasAmount]));
}

/**
 * Total projected annual retirement income across every source row.
 *
 * The per-client rows (CPP & OAS, TFSA) are counted only for clients that are
 * actually named — matching what the document prints. The wizard previously
 * counted client 1's rows even on a plan with no client named, so the figure on
 * screen could exceed the one in the generated document.
 */
export function retirementIncomeTotal(state: IflpFormState): number | null {
  const ri = state.retirementIncome;
  const perClient: (keyof RetirementIncomeInput)[][] = [
    ["cppOas1", "tfsa1"],
    ["cppOas2", "tfsa2"],
  ];
  const clientRows = namedClients(state).flatMap((_, i) =>
    perClient[i].map((key) => ri[key].annualIncome)
  );
  return sumOrNull([
    ...clientRows,
    ri.personalPension.annualIncome,
    ri.corporateLiquid.annualIncome,
    ri.corporateFixed.annualIncome,
  ]);
}

/** Combined education funding goal across every named child. */
export function educationTotal(state: IflpFormState): number | null {
  return sumOrNull(
    state.children
      .filter((c) => c.firstName.trim())
      .map((c) => c.educationCost)
  );
}

/** Retirement Buckets — total monthly contribution (Government has none). */
export function bucketMonthlyTotal(state: IflpFormState): number | null {
  const rb = state.retirementBuckets;
  return sumOrNull([rb.personalMonthly, rb.corpLiquidMonthly, rb.corpFixedMonthly]);
}

/** Retirement Buckets — total of the "What It Delivers / year" column. */
export function bucketAnnualTotal(state: IflpFormState): number | null {
  const rb = state.retirementBuckets;
  return sumOrNull([
    rb.governmentAnnual,
    rb.personalAnnual,
    rb.corpLiquidAnnual,
    rb.corpFixedAnnual,
  ]);
}

/** Monthly Savings Allocation — total across the three categories. */
export function monthlySavingsTotal(state: IflpFormState): number | null {
  const ms = state.monthlySavings;
  return sumOrNull([ms.personal, ms.corpLiquid, ms.corpFixed]);
}
