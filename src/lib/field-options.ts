// Dropdown option lists for the IFLP form.
//
// Strategy (v1.0.1): options are hard-coded here, in the frontend. The matching
// database columns stay permissive on purpose:
//   - Enum-backed lists below mirror a Postgres enum already in the schema.
//   - Provisional lists map to a free-text column, so any value persists today.
// Once a provisional list stabilizes, promote it to a DB enum (or lookup table)
// in a migration and delete the "provisional" note here.
//
// Shape matches SelectInput / TagInput: { label, value }[].

export interface FieldOption {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Enum-backed — these are complete; values match the enums in
// 20260717000000_iflp_plans.sql exactly. Do not add a value here without
// adding it to the enum too.
// ---------------------------------------------------------------------------

export const partyTypeOptions: FieldOption[] = [
  { label: "Client", value: "client" },
  { label: "Corporation", value: "corporation" },
];

export const accountScopeOptions: FieldOption[] = [
  { label: "Personal", value: "personal" },
  { label: "Corporate", value: "corporate" },
];

export const transferMethodOptions: FieldOption[] = [
  { label: "In-Kind", value: "in_kind" },
  { label: "In-Cash", value: "in_cash" },
];

export const insuranceTypeOptions: FieldOption[] = [
  { label: "Term Life", value: "term_life" },
  { label: "Critical Illness", value: "critical_illness" },
  { label: "Disability", value: "disability" },
];

export const accountTypeOptions: FieldOption[] = [
  { label: "TFSA", value: "tfsa" },
  { label: "RRSP", value: "rrsp" },
  { label: "PPP", value: "ppp" },
  { label: "Corporate Liquid Bucket", value: "corporate_liquid" },
  { label: "Corporate Fixed Bucket", value: "corporate_fixed" },
];

export const contributionFrequencyOptions: FieldOption[] = [
  { label: "Monthly", value: "monthly" },
  { label: "Annual", value: "annual" },
];

export const fundingKindOptions: FieldOption[] = [
  { label: "Lump Sum", value: "lump_sum" },
  { label: "Monthly", value: "monthly" },
];

// Income frequency for the "What Success Looks Like" income figures. Not a DB
// enum — the value is composed into the free-text success string that persists
// (e.g. "$1,200,000 annually"), so the option `value` is the exact adverb that
// renders in the document. Default is "annually".
export const incomeFrequencyOptions: FieldOption[] = [
  { label: "Bi-weekly", value: "bi-weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Annually", value: "annually" },
];

// Pension Bucket type, chosen when the bucket is included. Not a DB enum — it
// persists inside the plans.options jsonb blob, and it selects which pension page
// the document generates. Keep in sync with the PensionType union in iflp-form.ts.
export const pensionTypeOptions: FieldOption[] = [
  { label: "PPP — Personal Pension Plan", value: "ppp" },
  { label: "Other Pension Plan (IPP / Medicus)", value: "other_pension" },
  { label: "Defined Benefit Pension Plan", value: "defined_benefit" },
];

// The "Your Priorities" TagInput list. Suggested set from the template
// placeholder "Retirement, Tax Efficiency, Education, Protection", plus the
// extras already used in the Storybook story. Not closed: the TagInput's
// "Other" box adds free text alongside these, and the column that backs it
// (plans.priorities text[]) takes any string, so extend freely.
export const priorityOptions: FieldOption[] = [
  { label: "Retirement", value: "retirement" },
  { label: "Tax Efficiency", value: "tax-efficiency" },
  { label: "Education", value: "education" },
  { label: "Protection", value: "protection" },
];

// How a client draws income from the corporation, chosen per client in step 3.
// The choice decides which half of the document's Income Alignment section is
// populated, so the value doubles as the discriminator in IflpClient
// (`incomeStructure`) and in plan_income_alignment.income_type.
export const incomeStructureOptions: FieldOption[] = [
  { label: "Salary", value: "salary" },
  { label: "Dividends", value: "dividend" },
];

// ---------------------------------------------------------------------------
// PROVISIONAL — the template shows only ONE example value for each of these, so
// the lists below are INCOMPLETE. The single confirmed value is included; the
// rest must come from RFL. Do not invent financial products here. Each maps to a
// free-text column, so unknown values still save.
// ---------------------------------------------------------------------------

// plan_insurance.modifier, when insurance_type = 'term_life'. Confirmed: "30 Years".
// TODO(RFL): full term-length list.
export const termLengthOptions: FieldOption[] = [
  { label: "30 Years", value: "30 Years" },
];

// plan_insurance.modifier, when insurance_type = 'critical_illness'. Confirmed:
// "Living Benefit 75". TODO(RFL): full product list.
export const criticalIllnessProductOptions: FieldOption[] = [
  { label: "Living Benefit 75", value: "Living Benefit 75" },
];

// plan_insurance.modifier, when insurance_type = 'disability'. Confirmed:
// "To Age 65". TODO(RFL): full benefit-term list.
export const benefitTermOptions: FieldOption[] = [
  { label: "To Age 65", value: "To Age 65" },
];

// plan_account_transfers.account. Confirmed: "TFSA". TODO(RFL): full list of the
// account types that can be transferred.
export const transferAccountOptions: FieldOption[] = [
  { label: "TFSA", value: "TFSA" },
];

// plan_funding.funding_bucket. Confirmed: "TFSA", "Corporate Liquid Bucket".
// TODO(RFL): full list of funding buckets.
export const fundingBucketOptions: FieldOption[] = [
  { label: "TFSA", value: "TFSA" },
  { label: "Corporate Liquid Bucket", value: "Corporate Liquid Bucket" },
];
