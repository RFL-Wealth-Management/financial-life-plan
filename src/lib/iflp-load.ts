// Reconstruct an IflpFormState from the persisted plan rows — the inverse of
// buildPlanPayload (src/lib/iflp-persist.ts). One nested select pulls the plan
// and every child table (RLS scopes it to rows the caller may read), then this
// re-nests the flat rows back onto the wizard's shape so a saved plan can be
// regenerated (build the doc payload) or edited (prefill the wizard).
//
// Two fidelity caveats, both inherent to the schema (not this code):
//   - Success retirement/passive income is stored as the composed string
//     ("$1,200,000 annually"), so we parse the amount + frequency back out.
//   - plan_children has no age column, so a child's age comes back null.

import {
  ACCOUNT_KINDS,
  defaultPlanOptions,
  initialIflpFormState,
  MONTHS_PER_YEAR,
  type IflpFormState,
  type IflpClient,
  type AccountKind,
  type PartyKey,
  type PlanOptions,
} from "@/lib/iflp-form";
import type { SupabaseClient } from "@supabase/supabase-js";

const PLAN_SELECT = `
  *,
  plan_parties(*),
  plan_children(*),
  plan_other_priorities(*),
  plan_retirement_buckets(*),
  plan_monthly_savings(*),
  plan_income_alignment(*),
  plan_government_benefits(*),
  plan_accounts(*),
  plan_insurance(*),
  plan_account_transfers(*),
  plan_funding(*),
  plan_access_to_capital(*),
  plan_retirement_income(*)
`;

// The nested query returns snake_case rows; kept loose since the DB types aren't
// generated. Every access below is defensive (?? / optional) so a missing
// section just leaves the form default in place.
type AnyRow = Record<string, unknown>;
const bySort = (rows: AnyRow[]) =>
  [...rows].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

/**
 * Load a saved plan and rebuild the wizard's form state, or null if the plan
 * doesn't exist / isn't visible to the caller (RLS). `supabase` must carry the
 * user's session.
 */
export async function loadPlanState(
  supabase: SupabaseClient,
  planId: string
): Promise<IflpFormState | null> {
  const { data: plan } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return null;

  const state: IflpFormState = structuredClone(initialIflpFormState);

  // --- Plan-level fields -----------------------------------------------------
  state.planMonth = (plan.plan_month as string) ?? "";
  state.planYear = (plan.plan_year as number) ?? new Date().getFullYear();
  state.householdIncome = (plan.household_income as number) ?? null;
  state.priorities = (plan.priorities as string[]) ?? [];
  state.targetIndependenceAge = (plan.target_independence_age as number) ?? null;

  // plans.success_* are deliberately NOT read back. They are a snapshot of what
  // the document printed; the form recomputes all four from their source fields
  // (retirement income total, Corporate Fixed figures, Access to Capital year 10),
  // so reading the stored strings could only reintroduce a stale value.

  // Inclusion switches. A key absent from the blob falls back to the app default,
  // so plans saved before plans.options existed load with every account included
  // and no pension — which is what those plans' documents already contained.
  state.planOptions = {
    ...defaultPlanOptions,
    ...((plan.options as Partial<PlanOptions>) ?? {}),
  };

  state.corporateAccounts.fixedAnnualTaxFreeIncome =
    (plan.corp_fixed_annual_tax_free_income as number) ?? null;
  state.corporateAccounts.fixedContributionPeriodYears =
    (plan.corp_fixed_contribution_period_years as number) ?? null;
  state.corporateAccounts.fixedEstateValue =
    (plan.corp_fixed_estate_value as number) ?? null;
  state.corporateAccounts.fixedTotalLifetimeValue =
    (plan.corp_fixed_total_lifetime_value as number) ?? null;

  // --- Parties: rebuild client1/client2/corporation and a party_id -> key map -
  const parties = bySort((plan.plan_parties as AnyRow[]) ?? []);
  const clientParties = parties.filter((p) => p.party_type === "client");
  const corpParty = parties.find((p) => p.party_type === "corporation");
  const keyById = new Map<string, PartyKey>();

  const fillClientBasics = (c: IflpClient, row: AnyRow | undefined) => {
    if (!row) return;
    c.firstName = (row.first_name as string) ?? "";
    c.lastName = (row.last_name as string) ?? "";
    c.age = (row.age as number) ?? null;
  };
  fillClientBasics(state.client1, clientParties[0]);
  fillClientBasics(state.client2, clientParties[1]);
  if (clientParties[0]) keyById.set(clientParties[0].id as string, "client1");
  if (clientParties[1]) keyById.set(clientParties[1].id as string, "client2");
  if (corpParty) {
    state.corporationName = (corpParty.display_name as string) ?? "";
    keyById.set(corpParty.id as string, "corporation");
  }

  // The IflpClient a party key maps to (only clients carry per-client figures).
  const clientFor = (key: PartyKey | undefined): IflpClient | null =>
    key === "client1" ? state.client1 : key === "client2" ? state.client2 : null;
  const keyOf = (partyId: unknown): PartyKey | undefined =>
    partyId ? keyById.get(partyId as string) : undefined;

  // --- Children --------------------------------------------------------------
  state.children = bySort((plan.plan_children as AnyRow[]) ?? []).map((r) => ({
    firstName: (r.first_name as string) ?? "",
    lastName: (r.last_name as string) ?? "",
    age: null, // not persisted
    educationCost: (r.education_cost as number) ?? null,
    educationYearsAway: (r.education_years_away as number) ?? null,
  }));

  // --- Other priorities ------------------------------------------------------
  state.otherPriorities = bySort(
    (plan.plan_other_priorities as AnyRow[]) ?? []
  ).map((r) => ({
    name: (r.name as string) ?? "",
    outcome: (r.outcome as string) ?? "",
  }));

  // --- Retirement buckets (fixed order: gov, personal, corpLiquid, corpFixed) -
  const buckets = bySort((plan.plan_retirement_buckets as AnyRow[]) ?? []);
  const rb = state.retirementBuckets;
  const num = (r: AnyRow | undefined, k: string) => (r?.[k] as number) ?? null;
  // buckets[0] (Government) and buckets[3].annual_value (Corporate Fixed) hold
  // derived figures — a snapshot of what the document printed. Recomputed from
  // their sources on every render, so they are not read back here.
  rb.personalMonthly = num(buckets[1], "contribution");
  rb.personalAnnual = num(buckets[1], "annual_value");
  rb.corpLiquidMonthly = num(buckets[2], "contribution");
  rb.corpFixedMonthly = num(buckets[3], "contribution");

  // --- Monthly savings -------------------------------------------------------
  // Nothing is restored from plan_monthly_savings any more: all three rows are
  // derived from the accounts that feed them (comments 10, 11 and 12), so the
  // stored rows are a snapshot of what the document printed, not an input.

  // --- Income alignment + government benefits (per client) -------------------
  for (const r of (plan.plan_income_alignment as AnyRow[]) ?? []) {
    const c = clientFor(keyOf(r.party_id));
    if (!c) continue;
    c.incomeAlignmentAmount = (r.amount as number) ?? null;
    // Rows written before income_type existed are salary (see the migration),
    // and so is anything unrecognised.
    c.incomeStructure = r.income_type === "dividend" ? "dividend" : "salary";
  }
  for (const r of (plan.plan_government_benefits as AnyRow[]) ?? []) {
    const c = clientFor(keyOf(r.party_id));
    if (c) {
      c.cppAmount = (r.cpp_amount as number) ?? null;
      c.oasAmount = (r.oas_amount as number) ?? null;
    }
  }

  // --- Accounts --------------------------------------------------------------
  // Contributions are stored monthly. Plans saved before that convention wrote an
  // annual figure with contribution_frequency = 'annual', so those are converted
  // on read and old plans open with a sensible monthly amount.
  //
  // TODO(RFL): confirm the rounding. A $7,000 annual TFSA becomes $583/month,
  // which re-derives to $6,996 — a $4 drift on plans saved before this change.
  // See the note in the summary; alternatives are rounding up, or leaving legacy
  // plans' annual figure untouched.
  const monthlyContribution = (r: AnyRow): number | null => {
    const amount = (r.contribution as number) ?? null;
    if (amount == null) return null;
    return r.contribution_frequency === "annual"
      ? Math.round(amount / MONTHS_PER_YEAR)
      : amount;
  };

  // One form row per stored row, in saved order. A row whose account_type this
  // build doesn't know (a newer enum value against older code) is skipped rather
  // than guessed at.
  state.accounts = bySort((plan.plan_accounts as AnyRow[]) ?? [])
    .filter((r) => (r.account_type as AccountKind) in ACCOUNT_KINDS)
    .map((r) => ({
      kind: r.account_type as AccountKind,
      party: keyOf(r.party_id) ?? "",
      monthlyContribution: monthlyContribution(r),
      estimatedValue: (r.estimated_value as number) ?? null,
      // Filled in from plan_retirement_income below — plan_accounts has no column
      // for it.
      retirementIncome: null,
    }));

  // --- Insurance -------------------------------------------------------------
  for (const r of (plan.plan_insurance as AnyRow[]) ?? []) {
    const c = clientFor(keyOf(r.party_id));
    if (!c) continue;
    const amount = (r.amount as number) ?? null;
    const modifier = r.modifier as string | null;
    if (r.insurance_type === "term_life") {
      c.termLifeCoverage = amount;
      if (modifier != null) c.termLifeTerm = modifier;
    } else if (r.insurance_type === "critical_illness") {
      c.criticalIllnessCoverage = amount;
      if (modifier != null) c.criticalIllnessProduct = modifier;
    } else if (r.insurance_type === "disability") {
      c.disabilityMonthlyBenefit = amount;
      if (modifier != null) c.disabilityBenefitTerm = modifier;
    }
  }

  // --- Account transfers (personal / corporate) ------------------------------
  const transfers = bySort((plan.plan_account_transfers as AnyRow[]) ?? []);
  const toTransfer = (r: AnyRow) => ({
    party: keyOf(r.party_id) ?? "",
    institution: (r.institution as string) ?? "",
    account: (r.account as string) ?? "",
    method: (r.transfer_method as string) ?? "",
    expectedTime: (r.expected_time as string) ?? "",
  });
  state.transfersPersonal = transfers
    .filter((r) => r.account_scope === "personal")
    .map(toTransfer);
  state.transfersCorporate = transfers
    .filter((r) => r.account_scope === "corporate")
    .map(toTransfer);

  // --- Funding (lump-sum / monthly x personal / corporate) -------------------
  const funding = bySort((plan.plan_funding as AnyRow[]) ?? []);
  const toFunding = (r: AnyRow) => ({
    party: keyOf(r.party_id) ?? "",
    amount: (r.amount as number) ?? null,
    bucket: (r.funding_bucket as string) ?? "",
  });
  const fundingOf = (kind: string, scope: string) =>
    funding
      .filter((r) => r.funding_kind === kind && r.account_scope === scope)
      .map(toFunding);
  state.fundingPersonal = fundingOf("lump_sum", "personal");
  state.fundingCorporate = fundingOf("lump_sum", "corporate");
  state.monthlyPersonal = fundingOf("monthly", "personal");
  state.monthlyCorporate = fundingOf("monthly", "corporate");

  // --- Access to capital (by milestone year) ---------------------------------
  const yearField: Record<number, keyof IflpFormState["accessToCapital"]> = {
    2: "year2",
    4: "year4",
    6: "year6",
    8: "year8",
    10: "year10",
  };
  for (const r of (plan.plan_access_to_capital as AnyRow[]) ?? []) {
    const field = yearField[r.year_offset as number];
    if (field) state.accessToCapital[field] = (r.amount as number) ?? null;
  }

  // --- Retirement income summary ---------------------------------------------
  for (const r of (plan.plan_retirement_income as AnyRow[]) ?? []) {
    const source = r.source as string;
    const cell = {
      annualIncome: (r.annual_income as number) ?? null,
      estateValue: (r.estate_value as number) ?? null,
    };
    const inc = state.retirementIncome;
    if (source === "cpp_oas") {
      const key = keyOf(r.party_id);
      if (key === "client1") inc.cppOas1 = cell;
      else if (key === "client2") inc.cppOas2 = cell;
    } else if (source === "tfsa") {
      const key = keyOf(r.party_id);
      if (key === "client1") inc.tfsa1 = cell;
      else if (key === "client2") inc.tfsa2 = cell;
    } else if (source === "personal_pension") {
      inc.personalPension = cell;
    } else if (source === "corporate_liquid") {
      // The annual income is entered on the Corporate Liquid account card, so it
      // loads back onto the account rather than into this table; only the estate
      // value belongs here.
      //
      // plan_retirement_income stores one corporate_liquid row holding the total
      // across every such account, so with the usual single account this is
      // exact. With more than one the total lands on the first card and the rest
      // show blank — every derived figure still totals correctly, since they sum
      // the cards. Give plan_accounts its own retirement_income column if
      // multi-account corporate liquid ever becomes real.
      const liquid = state.accounts.find((a) => a.kind === "corporate_liquid");
      if (liquid) liquid.retirementIncome = cell.annualIncome;
      inc.corporateLiquid = { estateValue: cell.estateValue };
    } else if (source === "corporate_fixed") {
      inc.corporateFixed = cell;
    }
  }

  return state;
}
