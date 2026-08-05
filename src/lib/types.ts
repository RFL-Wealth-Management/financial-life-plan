export type UserRole = "admin" | "user";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  ownerId: string;
  client1Name: string;
  client2Name: string | null;
  createdAt: string;
}

export interface Client {
  firstName: string;
  lastName: string;
  age: number | null;
  cppAmount: number | null;
  oasAmount: number | null;
  rrspContribution: number | null;
  rrspEstimatedValue: number | null;
  pppContribution: number | null;
  pppEstimatedValue: number | null;
  tfsaContribution: number | null;
  tfsaEstimatedValue: number | null;
  retirementIncome: number | null;
  retirementIncomeAfterTax: number | null;
  criticalIllnessCoverage: number | null;
  criticalIllnessProduct: string;
  disabilityMonthlyBenefit: number | null;
  disabilityBenefitTerm: string;
  incomeAlignmentAmount: number | null;
}

export interface Child {
  name: string;
  educationCost: number | null;
  educationYearsAway: number | null;
}

export interface Corporation {
  name: string;
  liquidBucketContribution: number | null;
  liquidBucketEstimatedValue: number | null;
}

export interface PlanMetadata {
  month: string;
  year: number;
  priorities: string[];
  successRetirementIncome: string;
  successPassiveIncome: string;
  successLiquidCapital: string;
  successNetWorth: string;
  advisorName: string;
  advisorPhone: string;
  advisorEmail: string;
}

export interface RetirementBuckets {
  values: (number | null)[];
  total: number | null;
}

export interface MonthlySavings {
  values: (number | null)[];
  total: number | null;
}

export interface AccessToCapital {
  values: (number | null)[];
}

export interface ExpectedOutcome {
  contribution: number | null;
  years: number | null;
  estimatedLow: number | null;
  estimatedHigh: number | null;
}

export interface FormData {
  client1: Client;
  client2: Client | null;
  children: Child[];
  corporation: Corporation;
  metadata: PlanMetadata;
  retirementBuckets: RetirementBuckets;
  monthlySavings: MonthlySavings;
  accessToCapital: AccessToCapital;
  expectedOutcome: ExpectedOutcome;
}

// ---------------------------------------------------------------------------
// Database rows — one interface per table in the IFLP schema migration
// (20260717000000_iflp_plans.sql). These mirror the persisted shape (snake_case
// columns, nullable where the column is nullable) and are separate from the
// FormData shape above, which the form layer reconciles into these.
// ---------------------------------------------------------------------------

export type PartyType = "client" | "corporation";
export type AccountScope = "personal" | "corporate";
export type TransferMethod = "in_kind" | "in_cash";
export type InsuranceType = "term_life" | "critical_illness" | "disability";
export type AccountType =
  | "tfsa"
  | "rrsp"
  | "ppp"
  | "corporate_liquid"
  | "corporate_fixed";
export type ContributionFrequency = "monthly" | "annual";
export type FundingKind = "lump_sum" | "monthly";
export type RetirementIncomeSource =
  | "cpp_oas"
  | "tfsa"
  | "personal_pension"
  | "corporate_liquid"
  | "corporate_fixed";

export interface PlanRow {
  id: string;
  owner_id: string;
  plan_month: string | null;
  plan_year: number | null;
  household_income: number | null;
  priorities: string[];
  target_independence_age: number | null;
  success_retirement_income: string | null;
  success_passive_income: string | null;
  success_liquid_capital: string | null;
  success_net_worth: string | null;
  // Corporate Fixed Bucket "delivers" metrics (added 20260804000000).
  corp_fixed_annual_tax_free_income: number | null;
  corp_fixed_contribution_period_years: number | null;
  corp_fixed_estate_value: number | null;
  corp_fixed_total_lifetime_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlanPartyRow {
  id: string;
  plan_id: string;
  party_type: PartyType;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  sort_order: number;
}

export interface PlanChildRow {
  id: string;
  plan_id: string;
  name: string | null;
  education_cost: number | null;
  education_years_away: number | null;
  sort_order: number;
}

export interface PlanRetirementBucketRow {
  id: string;
  plan_id: string;
  contribution: number | null;
  annual_value: number | null;
  sort_order: number;
}

export interface PlanMonthlySavingRow {
  id: string;
  plan_id: string;
  label: string | null;
  amount: number | null;
  sort_order: number;
}

export interface PlanIncomeAlignmentRow {
  id: string;
  plan_id: string;
  party_id: string | null;
  amount: number | null;
  sort_order: number;
}

export interface PlanGovernmentBenefitRow {
  id: string;
  plan_id: string;
  party_id: string | null;
  cpp_amount: number | null;
  oas_amount: number | null;
  sort_order: number;
}

export interface PlanAccountRow {
  id: string;
  plan_id: string;
  account_type: AccountType;
  party_id: string | null;
  contribution: number | null;
  contribution_frequency: ContributionFrequency | null;
  estimated_value: number | null;
  sort_order: number;
}

export interface PlanInsuranceRow {
  id: string;
  plan_id: string;
  insurance_type: InsuranceType;
  party_id: string | null;
  amount: number | null;
  modifier: string | null;
  sort_order: number;
}

export interface PlanAccountTransferRow {
  id: string;
  plan_id: string;
  account_scope: AccountScope;
  party_id: string | null;
  institution: string | null;
  account: string | null;
  transfer_method: TransferMethod | null;
  expected_time: string | null;
  sort_order: number;
}

export interface PlanFundingRow {
  id: string;
  plan_id: string;
  funding_kind: FundingKind;
  account_scope: AccountScope;
  party_id: string | null;
  amount: number | null;
  funding_bucket: string | null;
  sort_order: number;
}

export interface PlanAccessToCapitalRow {
  id: string;
  plan_id: string;
  year_offset: number;
  amount: number | null;
  sort_order: number;
}

export interface PlanRetirementIncomeRow {
  id: string;
  plan_id: string;
  source: RetirementIncomeSource;
  party_id: string | null;
  annual_income: number | null;
  estate_value: number | null;
  sort_order: number;
}
