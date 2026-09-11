// Derived figures for the IFLP — the single source of truth for every number
// the planner does not type.
//
// Why this module exists: nearly every total in the plan is needed twice, once
// by the wizard (to show the planner) and once by `buildIflpDocPayload` (to
// print in the document). Computing them in both places is how the two came to
// disagree. Every selector here returns `number | null`; the caller formats it —
// `moneyOrDash` for the wizard, `moneyOrBlank` for the document.
//
// RULE: keep runtime imports from `iflp-form.ts` to plain data only — constants
// like PERSONAL_SAVINGS_KINDS, never functions that read back into this module.
// The cycle is real but harmless while it stays one-directional at runtime; the
// moment a selector here is called from module scope in `iflp-form.ts`, it breaks.
// Everything else comes across as `import type`, which is erased at compile time.
//
// `null` means "no figure entered", and propagates: a total of all-null inputs
// is null, not 0, so blank tables read as blank rather than as a plan with zero
// dollars in it.

import { sumOrNull } from "@/lib/format";
import { PERSONAL_SAVINGS_KINDS } from "@/lib/iflp-form";
import type { AccountKind, AccountRow, IflpClient, IflpFormState } from "@/lib/iflp-form";

/** The Projected Annual Retirement Income rows that exist once per client. */
type PerClientIncomeKey = "cppOas1" | "cppOas2" | "tfsa1" | "tfsa2";

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
// Accounts
// ---------------------------------------------------------------------------

/** Every account of a given kind, in the order the planner added them. */
export function accountsOfKind(
  state: IflpFormState,
  kind: AccountKind
): AccountRow[] {
  return state.accounts.filter((a) => a.kind === kind);
}

/** Whether the plan holds at least one account of this kind — i.e. whether its
 *  page belongs in the document. Adding an account is what includes it. */
export function hasAccount(state: IflpFormState, kind: AccountKind): boolean {
  return state.accounts.some((a) => a.kind === kind);
}

/** Total monthly contribution across every account of a kind. */
export function monthlyForKind(
  state: IflpFormState,
  kind: AccountKind
): number | null {
  return sumOrNull(accountsOfKind(state, kind).map((a) => a.monthlyContribution));
}

/**
 * Monthly savings directed at the personal accounts — TFSA, RRSP, FHSA and
 * Non-Registered added together. Only accounts the planner actually added count,
 * which is what makes the Monthly Savings Allocation follow inclusion.
 */
export function personalSavingsMonthly(state: IflpFormState): number | null {
  return sumOrNull(
    state.accounts
      .filter((a) => PERSONAL_SAVINGS_KINDS.includes(a.kind))
      .map((a) => a.monthlyContribution)
  );
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
  // Narrowed to the per-client keys — the plan-level entries have different
  // shapes, and Corporate Liquid's income no longer lives on this object at all.
  const perClient: PerClientIncomeKey[][] = [
    ["cppOas1", "tfsa1"],
    ["cppOas2", "tfsa2"],
  ];
  const clientRows = namedClients(state).flatMap((_, i) =>
    perClient[i].map((key) => ri[key].annualIncome)
  );
  return sumOrNull([
    ...clientRows,
    ri.personalPension.annualIncome,
    corporateLiquidIncome(state),
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
    governmentDelivers(state),
    rb.personalAnnual,
    corporateLiquidIncome(state),
    corporateFixedDelivers(state),
  ]);
}

/**
 * Corporate Fixed Bucket monthly contribution for the whole plan — the per-client
 * figures summed. The bucket rows against the plan, not against a client, so
 * both clients' contributions land in one bucket row and one savings allocation.
 */
export function corporateFixedMonthly(state: IflpFormState): number | null {
  return monthlyForKind(state, "corporate_fixed");
}

/**
 * What each Retirement Bucket delivers per year. These are no longer typed into
 * the buckets table — each one already existed as a figure elsewhere in the plan,
 * and the buckets table is a summary of those.
 *
 * Corporate Liquid is absent on purpose: it has no source field yet. Its
 * "Annual Income in Retirement" input arrives with comment 8, and until then the
 * bucket keeps its own typed value.
 */
export function governmentDelivers(state: IflpFormState): number | null {
  return governmentBenefitsTotal(state);
}

export function corporateFixedDelivers(state: IflpFormState): number | null {
  return state.corporateAccounts.fixedAnnualTaxFreeIncome;
}

/**
 * What the Corporate Liquid Bucket pays out per year in retirement. Entered once,
 * in the account section (comment 8), and read from here by both the Retirement
 * Buckets "delivers" cell and the Projected Annual Retirement Income row.
 */
export function corporateLiquidIncome(state: IflpFormState): number | null {
  return sumOrNull(
    accountsOfKind(state, "corporate_liquid").map((a) => a.retirementIncome)
  );
}

/** Monthly Savings Allocation — total across the three categories. */
export function monthlySavingsTotal(state: IflpFormState): number | null {
  return sumOrNull([
    personalSavingsMonthly(state),
    monthlySavingsCorpLiquid(state),
    monthlySavingsCorpFixed(state),
  ]);
}

/**
 * Monthly Savings Allocation — every row now mirrors the accounts that feed it,
 * so the allocation table cannot disagree with the account sections. Personal
 * Savings is the sum of the four personal accounts (comment 10); the two
 * corporate rows read their account directly (comments 11 and 12).
 */
export function monthlySavingsCorpLiquid(state: IflpFormState): number | null {
  return monthlyForKind(state, "corporate_liquid");
}

export function monthlySavingsCorpFixed(state: IflpFormState): number | null {
  return corporateFixedMonthly(state);
}
