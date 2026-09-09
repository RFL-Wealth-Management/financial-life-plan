// Persist an IFLP wizard submission into the normalized plans schema.
//
// The form state (src/lib/iflp-form.ts) is a single nested object keyed by
// "client1"/"client2"/"corporation". The database (20260717000000_iflp_plans.sql
// + 20260804000000_iflp_plan_extras.sql) is normalized: one `plans` row and many
// child tables that reference a party by its `plan_parties.id` UUID — not by the
// form's party key.
//
// This module builds a single JSON payload from the form state and hands it to
// the `create_plan(payload jsonb)` Postgres function, which inserts everything
// in one transaction (all-or-nothing; see the migration). To make the child
// rows self-contained, we pre-generate each party's UUID here so a child row can
// carry a resolved `party_id` before anything is inserted. The function forces
// the plan's owner to auth.uid() and returns the new plan id.

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clientRecords,
  deriveClients,
  formatIncome,
  type IflpClient,
  type IflpFormState,
  type PartyKey,
} from "@/lib/iflp-form";

const trimOrNull = (s: string): string | null => {
  const t = s.trim();
  return t ? t : null;
};

type Row = Record<string, unknown>;

// The shape handed to create_plan(). Keys match the `payload->'...'` lookups in
// the SQL function; each array's row shape mirrors that section's column list.
interface PlanPayload {
  plan: Row;
  parties: Row[];
  children: Row[];
  other_priorities: Row[];
  retirement_buckets: Row[];
  monthly_savings: Row[];
  income_alignment: Row[];
  government_benefits: Row[];
  accounts: Row[];
  insurance: Row[];
  account_transfers: Row[];
  funding: Row[];
  access_to_capital: Row[];
  retirement_income: Row[];
}

function hasName(c: IflpClient): boolean {
  return Boolean(c.firstName.trim() || c.lastName.trim());
}
function fullName(c: IflpClient): string {
  return [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// plans — the root row. owner_id and id are set by the SQL function, not here.
// ---------------------------------------------------------------------------
function buildPlan(state: IflpFormState): Row {
  return {
    plan_month: trimOrNull(state.planMonth),
    plan_year: state.planYear || null,
    household_income: state.householdIncome,
    priorities: state.priorities,
    target_independence_age: state.targetIndependenceAge,
    // Success figures persist as the composed strings the document renders
    // (e.g. "$1,200,000 annually"); the plain-text ones store verbatim.
    success_retirement_income:
      formatIncome(state.retirementIncomeAmount, state.retirementIncomeFrequency) || null,
    success_passive_income:
      formatIncome(state.passiveIncomeAmount, state.passiveIncomeFrequency) || null,
    success_liquid_capital: trimOrNull(state.successLiquidCapital),
    success_net_worth: trimOrNull(state.successNetWorth),
    corp_fixed_annual_tax_free_income: state.corporateAccounts.fixedAnnualTaxFreeIncome,
    corp_fixed_contribution_period_years: state.corporateAccounts.fixedContributionPeriodYears,
    corp_fixed_estate_value: state.corporateAccounts.fixedEstateValue,
    corp_fixed_total_lifetime_value: state.corporateAccounts.fixedTotalLifetimeValue,
  };
}

// ---------------------------------------------------------------------------
// plan_parties — clients (if named) then the corporation (if named), each with
// a pre-generated UUID so downstream child rows can reference it immediately.
// ---------------------------------------------------------------------------
function buildParties(state: IflpFormState): {
  rows: Row[];
  idByKey: Map<PartyKey, string>;
} {
  const rows: Row[] = [];
  const idByKey = new Map<PartyKey, string>();
  let order = 0;

  const pushClient = (key: "client1" | "client2", c: IflpClient) => {
    if (!hasName(c)) return;
    const id = randomUUID();
    idByKey.set(key, id);
    rows.push({
      id,
      party_type: "client",
      display_name: fullName(c),
      first_name: trimOrNull(c.firstName),
      last_name: trimOrNull(c.lastName),
      age: c.age,
      sort_order: order++,
    });
  };

  pushClient("client1", state.client1);
  pushClient("client2", state.client2);

  const corp = state.corporationName.trim();
  if (corp) {
    const id = randomUUID();
    idByKey.set("corporation", id);
    rows.push({
      id,
      party_type: "corporation",
      display_name: corp,
      first_name: null,
      last_name: null,
      age: null,
      sort_order: order++,
    });
  }

  return { rows, idByKey };
}

// ---------------------------------------------------------------------------
// Assemble the full payload. Child rows carry no plan_id (create_plan supplies
// it); per-party rows carry the resolved party_id from `idByKey`.
// ---------------------------------------------------------------------------
function buildPlanPayload(state: IflpFormState): PlanPayload {
  const { rows: parties, idByKey } = buildParties(state);
  const partyId = (key: PartyKey): string | null => idByKey.get(key) ?? null;

  // Clients, paired with their form key, in document order (client1, client2).
  const clients = deriveClients(state); // parties, carry `.key`
  const records = clientRecords(state); // aligned IflpClient records
  const perClient = <T extends Row>(fn: (c: IflpClient, key: PartyKey, i: number) => T): T[] =>
    clients.map((p, i) => fn(records[i], p.key, i));

  // plan_children — only children the planner actually named. A first name is
  // what makes a child "named"; the last name is optional, like the clients'.
  const children: Row[] = state.children
    .filter((c) => c.firstName.trim())
    .map((c, i) => ({
      first_name: c.firstName.trim(),
      last_name: trimOrNull(c.lastName),
      education_cost: c.educationCost,
      education_years_away: c.educationYearsAway,
      sort_order: i,
    }));

  // plan_other_priorities — the planner's own priorities, name + desired
  // outcome. A name is what makes a row (matching plan_children); a row with
  // only an outcome has nothing to label it and is dropped.
  const other_priorities: Row[] = state.otherPriorities
    .filter((op) => op.name.trim())
    .map((op, i) => ({
      name: op.name.trim(),
      outcome: trimOrNull(op.outcome),
      sort_order: i,
    }));

  // plan_retirement_buckets — four fixed rows (Government has no contribution).
  const rb = state.retirementBuckets;
  const retirement_buckets: Row[] = [
    { contribution: null, annual_value: rb.governmentAnnual },
    { contribution: rb.personalMonthly, annual_value: rb.personalAnnual },
    { contribution: rb.corpLiquidMonthly, annual_value: rb.corpLiquidAnnual },
    { contribution: rb.corpFixedMonthly, annual_value: rb.corpFixedAnnual },
  ].map((r, i) => ({ ...r, sort_order: i }));

  // plan_monthly_savings — three labelled fixed rows.
  const ms = state.monthlySavings;
  const monthly_savings: Row[] = [
    { label: "Personal Savings", amount: ms.personal },
    { label: "Corporate Liquid Bucket", amount: ms.corpLiquid },
    { label: "Corporate Fixed Bucket", amount: ms.corpFixed },
  ].map((r, i) => ({ ...r, sort_order: i }));

  // plan_income_alignment — one row per client. `amount` is whichever structure
  // the client draws; income_type says which one, so a dividend figure is never
  // read back as a salary.
  const income_alignment: Row[] = perClient((c, key, i) => ({
    party_id: partyId(key),
    amount: c.incomeAlignmentAmount,
    income_type: c.incomeStructure,
    sort_order: i,
  }));

  // plan_government_benefits — CPP & OAS per client.
  const government_benefits: Row[] = perClient((c, key, i) => ({
    party_id: partyId(key),
    cpp_amount: c.cppAmount,
    oas_amount: c.oasAmount,
    sort_order: i,
  }));

  // plan_accounts — registered + corporate accounts fold into one table,
  // distinguished by account_type. TFSA/RRSP/PPP/Corporate-Fixed contributions
  // are annual and per client; the Corporate Liquid bucket is monthly and rows
  // against the corporation only.
  const accounts: Row[] = [
    ...perClient((c, key, i) => ({
      account_type: "tfsa",
      party_id: partyId(key),
      contribution: c.tfsaContribution,
      contribution_frequency: "annual",
      estimated_value: c.tfsaEstimatedValue,
      sort_order: i,
    })),
    ...perClient((c, key, i) => ({
      account_type: "rrsp",
      party_id: partyId(key),
      contribution: c.rrspContribution,
      contribution_frequency: "annual",
      estimated_value: c.rrspEstimatedValue,
      sort_order: i,
    })),
    ...perClient((c, key, i) => ({
      account_type: "ppp",
      party_id: partyId(key),
      contribution: c.pppContribution,
      contribution_frequency: "annual",
      estimated_value: c.pppEstimatedValue,
      sort_order: i,
    })),
    ...perClient((c, key, i) => ({
      account_type: "corporate_fixed",
      party_id: partyId(key),
      contribution: c.corporateFixedContribution,
      contribution_frequency: "annual",
      estimated_value: null,
      sort_order: i,
    })),
  ];
  if (idByKey.has("corporation")) {
    const ca = state.corporateAccounts;
    accounts.push({
      account_type: "corporate_liquid",
      party_id: partyId("corporation"),
      contribution: ca.liquidMonthlyContribution,
      contribution_frequency: "monthly",
      estimated_value: ca.liquidEstimatedValue,
      sort_order: 0,
    });
  }

  // plan_insurance — Term Life / Critical Illness / Disability per client. Each
  // carries the amount plus the type-specific modifier (term / product / term).
  const insurance: Row[] = [
    ...perClient((c, key, i) => ({
      insurance_type: "term_life",
      party_id: partyId(key),
      amount: c.termLifeCoverage,
      modifier: c.termLifeTerm,
      sort_order: i,
    })),
    ...perClient((c, key, i) => ({
      insurance_type: "critical_illness",
      party_id: partyId(key),
      amount: c.criticalIllnessCoverage,
      modifier: c.criticalIllnessProduct,
      sort_order: i,
    })),
    ...perClient((c, key, i) => ({
      insurance_type: "disability",
      party_id: partyId(key),
      amount: c.disabilityMonthlyBenefit,
      modifier: c.disabilityBenefitTerm,
      sort_order: i,
    })),
  ];

  // plan_account_transfers — personal + corporate dynamic rows.
  const transferRows = (
    rows: IflpFormState["transfersPersonal"],
    scope: "personal" | "corporate"
  ): Row[] =>
    rows.map((r, i) => ({
      account_scope: scope,
      party_id: r.party ? partyId(r.party as PartyKey) : null,
      institution: trimOrNull(r.institution),
      account: r.account || null,
      transfer_method: r.method || null,
      expected_time: trimOrNull(r.expectedTime),
      sort_order: i,
    }));
  const account_transfers: Row[] = [
    ...transferRows(state.transfersPersonal, "personal"),
    ...transferRows(state.transfersCorporate, "corporate"),
  ];

  // plan_funding — four dynamic tables fold in via funding_kind + account_scope.
  const fundingRows = (
    rows: IflpFormState["fundingPersonal"],
    kind: "lump_sum" | "monthly",
    scope: "personal" | "corporate"
  ): Row[] =>
    rows.map((r, i) => ({
      funding_kind: kind,
      account_scope: scope,
      party_id: r.party ? partyId(r.party as PartyKey) : null,
      amount: r.amount,
      funding_bucket: r.bucket || null,
      sort_order: i,
    }));
  const funding: Row[] = [
    ...fundingRows(state.fundingPersonal, "lump_sum", "personal"),
    ...fundingRows(state.fundingCorporate, "lump_sum", "corporate"),
    ...fundingRows(state.monthlyPersonal, "monthly", "personal"),
    ...fundingRows(state.monthlyCorporate, "monthly", "corporate"),
  ];

  // plan_access_to_capital — fixed milestone years (Step 2).
  const ac = state.accessToCapital;
  const access_to_capital: Row[] = [
    { year_offset: 2, amount: ac.year2 },
    { year_offset: 4, amount: ac.year4 },
    { year_offset: 6, amount: ac.year6 },
    { year_offset: 8, amount: ac.year8 },
    { year_offset: 10, amount: ac.year10 },
  ].map((r, i) => ({ ...r, sort_order: i }));

  // plan_retirement_income — CPP & OAS and TFSA row per client (party_id set);
  // the pension and corporate buckets are single plan-level rows.
  const ri = state.retirementIncome;
  const cppOasSources = [ri.cppOas1, ri.cppOas2];
  const tfsaSources = [ri.tfsa1, ri.tfsa2];
  const retirement_income: Row[] = [];
  let riOrder = 0;
  clients.forEach((p, i) => {
    retirement_income.push({
      source: "cpp_oas",
      party_id: partyId(p.key),
      annual_income: cppOasSources[i].annualIncome,
      estate_value: cppOasSources[i].estateValue,
      sort_order: riOrder++,
    });
  });
  clients.forEach((p, i) => {
    retirement_income.push({
      source: "tfsa",
      party_id: partyId(p.key),
      annual_income: tfsaSources[i].annualIncome,
      estate_value: tfsaSources[i].estateValue,
      sort_order: riOrder++,
    });
  });
  ([
    ["personal_pension", ri.personalPension],
    ["corporate_liquid", ri.corporateLiquid],
    ["corporate_fixed", ri.corporateFixed],
  ] as const).forEach(([source, src]) => {
    retirement_income.push({
      source,
      party_id: null,
      annual_income: src.annualIncome,
      estate_value: src.estateValue,
      sort_order: riOrder++,
    });
  });

  return {
    plan: buildPlan(state),
    parties,
    children,
    other_priorities,
    retirement_buckets,
    monthly_savings,
    income_alignment,
    government_benefits,
    accounts,
    insurance,
    account_transfers,
    funding,
    access_to_capital,
    retirement_income,
  };
}

/**
 * Persist a full IFLP submission via the create_plan() RPC and return the new
 * plan's id.
 *
 * Atomicity and authorization are the database's job: create_plan() inserts
 * everything in one transaction (all-or-nothing) and, running as the caller,
 * forces owner_id = auth.uid() and enforces the same RLS as a direct insert.
 * `supabase` must be the request-scoped server client carrying the user's
 * session. Throws on failure.
 */
export async function savePlan(
  supabase: SupabaseClient,
  state: IflpFormState
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("create_plan", {
    payload: buildPlanPayload(state),
  });

  if (error) {
    throw new Error(`Failed to save plan: ${error.message}`);
  }

  return { id: data as string };
}

/**
 * Replace an existing plan's data in place via the update_plan() RPC and return
 * its id. Same atomicity and RLS guarantees as savePlan(): update_plan()
 * updates the row and rebuilds every child in one transaction, and rejects a
 * plan the caller doesn't own. Throws on failure.
 */
export async function updatePlan(
  supabase: SupabaseClient,
  state: IflpFormState,
  planId: string
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("update_plan", {
    p_plan_id: planId,
    payload: buildPlanPayload(state),
  });

  if (error) {
    throw new Error(`Failed to update plan: ${error.message}`);
  }

  return { id: data as string };
}
