// IFLP wizard form state, and the mapping from that state to the flat tag
// payload docxtemplater renders into templates/iflp.tagged.docx.
//
// This module is client-safe (no fs). docx-service imports only the payload
// type. As the form grows section by section, extend IflpFormState + the
// builder here, then hand-tag the matching {tags} in templates/iflp.tagged.docx
// (see docs/iflp-tagging.md).

// ---------------------------------------------------------------------------
// Form state. Field value types match the Storybook field components
// (src/components/fields) so they bind directly: numbers where the component
// takes number | null, strings for text.
// ---------------------------------------------------------------------------

export interface IflpClient {
  firstName: string;
  lastName: string;
  age: number | null;
  // Step 3 — per-client financials live on the client so a name entered once
  // (step 1) carries its figures through every table that rows per client.
  // Mirrors the persisted Client shape in types.ts.
  cppAmount: number | null;
  oasAmount: number | null;
  incomeAlignmentSalary: number | null;
  // Step 4 — registered accounts (contribution + projected value, per client).
  tfsaContribution: number | null;
  tfsaEstimatedValue: number | null;
  rrspContribution: number | null;
  rrspEstimatedValue: number | null;
  pppContribution: number | null;
  pppEstimatedValue: number | null;
  // Step 4 — Corporate Fixed Bucket annual contribution, per client.
  corporateFixedContribution: number | null;
  // Step 5 — Insurance, per client. Each is an amount plus a modifier (the term
  // length / product / benefit term chosen from a dropdown).
  termLifeCoverage: number | null;
  termLifeTerm: string;
  criticalIllnessCoverage: number | null;
  criticalIllnessProduct: string;
  disabilityMonthlyBenefit: number | null;
  disabilityBenefitTerm: string;
}

// Step 3 — Retirement Buckets. Fixed-label rows; only the amounts are entered.
// The Government bucket has no monthly contribution (renders "N/A"); every
// "annual" figure is the bucket's projected "What It Delivers". Totals are
// computed, not stored.
export interface RetirementBucketsInput {
  governmentAnnual: number | null;
  personalMonthly: number | null;
  personalAnnual: number | null;
  corpLiquidMonthly: number | null;
  corpLiquidAnnual: number | null;
  corpFixedMonthly: number | null;
  corpFixedAnnual: number | null;
}

// Step 3 — Monthly Savings Allocation. Three fixed rows; total is computed.
export interface MonthlySavingsInput {
  personal: number | null;
  corpLiquid: number | null;
  corpFixed: number | null;
}

// Step 2 — Projected Access To Capital. Fixed year rows (2/4/6/8/10); only the
// "Potential Capital Available" amount is entered per row. The year intervals are
// fixed by the template (and by the persisted AccessToCapital model in types.ts),
// so only the amounts are stored.
export interface AccessToCapitalInput {
  year2: number | null;
  year4: number | null;
  year6: number | null;
  year8: number | null;
  year10: number | null;
}

// Step 3 — Projected Annual Retirement Income (Your Retirement Income Summary).
// A fixed-row summary: each source contributes an annual income and an expected
// estate value. The client-specific rows (CPP & OAS, TFSA) drop out for a solo
// plan; PPP and the corporate buckets are single rows. The annual-income Total is
// auto-computed (estate has no total cell in the template).
export interface RetirementIncomeSource {
  annualIncome: number | null;
  estateValue: number | null;
}
export interface RetirementIncomeInput {
  cppOas1: RetirementIncomeSource;
  cppOas2: RetirementIncomeSource;
  tfsa1: RetirementIncomeSource;
  tfsa2: RetirementIncomeSource;
  personalPension: RetirementIncomeSource;
  corporateLiquid: RetirementIncomeSource;
  corporateFixed: RetirementIncomeSource;
}

// Step 4 — corporate account figures that aren't per-client. The Corporate
// Liquid Bucket rows against the corporation only (MPC), and the Corporate Fixed
// Bucket's "delivers" metrics are single figures for the whole plan.
export interface CorporateAccountsInput {
  liquidMonthlyContribution: number | null;
  liquidEstimatedValue: number | null;
  fixedAnnualTaxFreeIncome: number | null;
  fixedContributionPeriodYears: number | null;
  fixedEstateValue: number | null;
  fixedTotalLifetimeValue: number | null;
}

export interface IflpChild {
  firstName: string;
  age: number | null;
  // Step 4 — Education funding, per child.
  educationCost: number | null;
  educationYearsAway: number | null;
}

// Step 6 — Implementation. Dynamic (add/remove) rows the planner builds. `party`
// holds a PartyKey ("" if unset); the document renders the party's name.
export interface TransferRow {
  party: string;
  institution: string;
  account: string;
  method: string; // transfer-method value (mapped to a label in the document)
  expectedTime: string;
}
export interface FundingRow {
  party: string;
  amount: number | null;
  bucket: string;
}

export interface IflpFormState {
  planMonth: string;
  planYear: number;
  client1: IflpClient;
  client2: IflpClient;
  children: IflpChild[];
  corporationName: string;
  householdIncome: number | null;
  priorities: string[];
  // Step 2 — Goals & Success
  // The age at which the plan targets financial independence. Also drives the
  // Profile "Retirement Goal" row.
  targetIndependenceAge: number | null;
  // "What Success Looks Like" income figures — an amount plus how often it
  // recurs. Composed into the document string (e.g. "$1,200,000 annually").
  retirementIncomeAmount: number | null;
  retirementIncomeFrequency: IncomeFrequency;
  passiveIncomeAmount: number | null;
  passiveIncomeFrequency: IncomeFrequency;
  // The remaining two success figures are free-text prose the planner enters
  // verbatim (e.g. "$5.0M+ available", "$20.0M+") — not simple currency.
  successLiquidCapital: string;
  successNetWorth: string;
  // Step 2 — Projected Access To Capital table (fixed year rows; amounts only).
  accessToCapital: AccessToCapitalInput;
  // Step 3 — Projected Annual Retirement Income summary (fixed source rows).
  retirementIncome: RetirementIncomeInput;
  // Step 3 — fixed-row tables (per-client tables read off client1/client2).
  retirementBuckets: RetirementBucketsInput;
  monthlySavings: MonthlySavingsInput;
  // Step 4 — corporate account figures (per-client account figures live on the
  // clients; per-child education figures live on the children).
  corporateAccounts: CorporateAccountsInput;
  // Step 6 — Implementation (dynamic add/remove tables, personal + corporate).
  transfersPersonal: TransferRow[];
  transfersCorporate: TransferRow[];
  fundingPersonal: FundingRow[];
  fundingCorporate: FundingRow[];
  monthlyPersonal: FundingRow[];
  monthlyCorporate: FundingRow[];
}

// How often a success income figure recurs. The value doubles as the adverb
// rendered in the document, so keep it in sync with incomeFrequencyOptions.
export type IncomeFrequency = "bi-weekly" | "monthly" | "annually";

export const emptyClient: IflpClient = {
  firstName: "",
  lastName: "",
  age: null,
  cppAmount: null,
  oasAmount: null,
  incomeAlignmentSalary: null,
  tfsaContribution: null,
  tfsaEstimatedValue: null,
  rrspContribution: null,
  rrspEstimatedValue: null,
  pppContribution: null,
  pppEstimatedValue: null,
  corporateFixedContribution: null,
  termLifeCoverage: null,
  termLifeTerm: "30 Years",
  criticalIllnessCoverage: null,
  criticalIllnessProduct: "Living Benefit 75",
  disabilityMonthlyBenefit: null,
  disabilityBenefitTerm: "To Age 65",
};

export const emptyChild: IflpChild = {
  firstName: "",
  age: null,
  educationCost: null,
  educationYearsAway: null,
};

export const initialIflpFormState: IflpFormState = {
  planMonth: "",
  planYear: new Date().getFullYear(),
  client1: { ...emptyClient },
  client2: { ...emptyClient },
  children: [],
  corporationName: "",
  householdIncome: null,
  priorities: [],
  targetIndependenceAge: null,
  retirementIncomeAmount: null,
  retirementIncomeFrequency: "annually",
  passiveIncomeAmount: null,
  passiveIncomeFrequency: "annually",
  successLiquidCapital: "",
  successNetWorth: "",
  accessToCapital: {
    year2: null,
    year4: null,
    year6: null,
    year8: null,
    year10: null,
  },
  retirementIncome: {
    cppOas1: { annualIncome: null, estateValue: null },
    cppOas2: { annualIncome: null, estateValue: null },
    tfsa1: { annualIncome: null, estateValue: null },
    tfsa2: { annualIncome: null, estateValue: null },
    personalPension: { annualIncome: null, estateValue: null },
    corporateLiquid: { annualIncome: null, estateValue: null },
    corporateFixed: { annualIncome: null, estateValue: null },
  },
  retirementBuckets: {
    governmentAnnual: null,
    personalMonthly: null,
    personalAnnual: null,
    corpLiquidMonthly: null,
    corpLiquidAnnual: null,
    corpFixedMonthly: null,
    corpFixedAnnual: null,
  },
  monthlySavings: { personal: null, corpLiquid: null, corpFixed: null },
  corporateAccounts: {
    liquidMonthlyContribution: null,
    liquidEstimatedValue: null,
    fixedAnnualTaxFreeIncome: null,
    fixedContributionPeriodYears: null,
    fixedEstateValue: null,
    fixedTotalLifetimeValue: null,
  },
  transfersPersonal: [],
  transfersCorporate: [],
  fundingPersonal: [],
  fundingCorporate: [],
  monthlyPersonal: [],
  monthlyCorporate: [],
};

export const emptyTransferRow: TransferRow = {
  party: "",
  institution: "",
  account: "",
  method: "",
  expectedTime: "",
};

export const emptyFundingRow: FundingRow = { party: "", amount: null, bucket: "" };

// ---------------------------------------------------------------------------
// Wizard steps. Only "people" renders real fields today; the rest are
// placeholders so the shell, progress, and generate button work end-to-end.
// ---------------------------------------------------------------------------

export interface IflpStep {
  id: string;
  title: string;
  blurb: string;
}

export const IFLP_STEPS: IflpStep[] = [
  { id: "people", title: "People & Profile", blurb: "Clients, corporation, and profile basics." },
  { id: "goals", title: "Goals & Success", blurb: "Priorities, target age, and what success looks like." },
  { id: "retirement", title: "Retirement & Savings", blurb: "Buckets, income alignment, monthly savings, benefits." },
  { id: "accounts", title: "Accounts & Education", blurb: "Registered/corporate accounts and education funding." },
  { id: "insurance", title: "Insurance", blurb: "Term life, critical illness, and disability." },
  { id: "implementation", title: "Implementation", blurb: "Transfers, lump-sum, and monthly contributions." },
];

// ---------------------------------------------------------------------------
// Parties — the reuse primitive shared across steps
// ---------------------------------------------------------------------------
//
// A "party" is a client or the corporation — the entities every later-step table
// rows against (income alignment, CPP/OAS, accounts, insurance, transfers,
// funding). Step 1 (People & Profile) is the single source of truth: a name typed
// once here becomes a party, and later steps reference it by its stable `key`
// instead of re-entering the name. This mirrors the persisted model, where those
// tables carry a `party_id` (see PlanPartyRow and the `*_id` columns in types.ts).
//
// Derive parties from state wherever a step needs them — don't copy names into
// step-local fields, or step 1 stops being the source of truth.

export type PartyKey = "client1" | "client2" | "corporation";

export interface IflpParty {
  key: PartyKey;
  type: "client" | "corporation";
  /** Display name: the client's full name, or the corporation name. */
  name: string;
  /** First name for prose; "" for the corporation. */
  firstName: string;
  /** Age for client rows; null for the corporation. */
  age: number | null;
}

// The parties present in this plan, in document order: client 1 (once named),
// client 2 (only if a second client was entered), then the corporation (only if
// named). Absent parties are omitted, so a solo plan yields a single client and
// no phantom "Client 2" row anywhere downstream.
export function deriveParties(state: IflpFormState): IflpParty[] {
  const parties: IflpParty[] = [];
  if (hasClient(state.client1)) {
    parties.push({
      key: "client1",
      type: "client",
      name: fullName(state.client1),
      firstName: state.client1.firstName.trim(),
      age: state.client1.age,
    });
  }
  if (hasClient(state.client2)) {
    parties.push({
      key: "client2",
      type: "client",
      name: fullName(state.client2),
      firstName: state.client2.firstName.trim(),
      age: state.client2.age,
    });
  }
  const corp = state.corporationName.trim();
  if (corp) {
    parties.push({ key: "corporation", type: "corporation", name: corp, firstName: "", age: null });
  }
  return parties;
}

// Clients only (no corporation), for the "one row per client" tables — CPP/OAS,
// TFSA/RRSP/PPP, term life, etc.
export function deriveClients(state: IflpFormState): IflpParty[] {
  return deriveParties(state).filter((p) => p.type === "client");
}

// The clients (client 1, then client 2 if named) as IflpClient records, so a
// step can read the per-client figures it owns. Same ordering/inclusion rule as
// deriveClients.
export function clientRecords(state: IflpFormState): IflpClient[] {
  return [state.client1, state.client2].filter(hasClient);
}

// Option list for the "Client"/entity dropdown (SelectInput) in later-step
// tables: value is the stable party key, label is the name from step 1. Pass
// `clientsOnly` for tables that never row against the corporation.
export function partyOptions(
  state: IflpFormState,
  clientsOnly = false
): { label: string; value: PartyKey }[] {
  const parties = clientsOnly ? deriveClients(state) : deriveParties(state);
  return parties.map((p) => ({ label: p.name, value: p.key }));
}

// Resolve a stored party key back to its display name — for rendering a row a
// later step recorded as e.g. { party: "client1", amount: … }. Unknown/absent
// key -> "" (e.g. a row still pointing at a client that was removed).
export function partyName(state: IflpFormState, key: PartyKey): string {
  return deriveParties(state).find((p) => p.key === key)?.name ?? "";
}

// ---------------------------------------------------------------------------
// State -> doc payload
// ---------------------------------------------------------------------------

// One rendered row of the Government Benefits (CPP & OAS) table.
export interface GovernmentBenefitRow {
  name: string;
  cpp: string;
  oas: string;
}

// One rendered row of the Income Alignment table (Client | Salary).
export interface IncomeAlignmentRow {
  name: string;
  salary: string;
}

// One rendered row of a registered-account table (TFSA/RRSP/PPP): a client name,
// a contribution, and a projected value.
export interface AccountRow {
  name: string;
  contribution: string;
  estimatedValue: string;
}

// One rendered row of the Corporate Fixed Bucket contribution table.
export interface CorporateFixedRow {
  name: string;
  contribution: string;
}

// One rendered row of the Education Funding table (Child | Funding Goal | Years).
export interface EducationRow {
  name: string;
  cost: string;
  years: string;
}

// One rendered row of an insurance table: a client, an amount, and a modifier
// (term length / product / benefit term).
export interface InsuranceRow {
  name: string;
  amount: string;
  modifier: string;
}

// Rendered implementation rows (party resolved to a name; amount formatted).
export interface RenderedTransferRow {
  party: string;
  institution: string;
  account: string;
  method: string;
  expectedTime: string;
}
export interface RenderedFundingRow {
  party: string;
  amount: string;
  bucket: string;
}

// Flat keys are the {tags} typed into templates/iflp.tagged.docx. Values are
// strings (what lands in the document) or, for repeating tables, arrays of row
// objects that the template loops over.
export interface IflpDocPayload {
  planMonth: string;
  planYear: string;
  // The date this document was generated (final-page footer), from the render-time
  // clock — not the planner-entered plan date. Month is upper-cased to match the
  // template's "MONTH 2026" footer styling.
  generationMonth: string;
  generationYear: string;
  // Final-page "YOUR RFL PLANNER" block — the person generating the document,
  // resolved from their profile at render time (not entered on the form).
  // advisorName folds in the position ("NAME, POSITION"), upper-cased to match
  // the template's styling; email is upper-cased for the same reason.
  advisorName: string;
  advisorPhone: string;
  advisorEmail: string;
  client1Name: string;
  client2Name: string;
  welcomeGreeting: string;
  coverClients: string;
  corporationName: string;
  client1Age: string;
  householdIncome: string;
  priorities: string;
  children: string;
  // Subject + verb for the intro sentence, agreeing with client count:
  // "Dan and Sam are" (two clients) or "Dan is" (one). The template supplies
  // the rest of the sentence ("… in a strong financial position …").
  clientsClause: string;
  // Whether the plan has at least one named child. Gates the Family education
  // goal table ({#hasChildren} … {/hasChildren}) so it drops out entirely when
  // there are no children.
  hasChildren: boolean;
  // Named children rendered as a possessive list for the Family goal row, e.g.
  // "Emma and Liam’s" / "Emma’s". Empty when there are no children.
  childrenNames: string;
  // Loop-ready party lists for the per-row tables. In the template, a table row
  // becomes a docxtemplater loop over one of these, e.g.
  //   {#clients}<cell>{name}</cell><cell>{cppAmount}</cell>{/clients}
  // so the row repeats once per client with the name reused from step 1 — and a
  // solo plan drops the second row automatically (no phantom "Client 2").
  // `parties` also includes the corporation for tables that row against it.
  clients: IflpParty[];
  parties: IflpParty[];
  // Step 3 — Government benefits (CPP & OAS). One row per client, looped in the
  // template as {#governmentBenefits} … {/governmentBenefits}; the name is reused
  // from step 1 and the total is summed here (auto-computed, not entered).
  governmentBenefits: GovernmentBenefitRow[];
  governmentBenefitsTotal: string;
  // Step 3 — Income Alignment (Client | Salary), one row per client.
  incomeAlignment: IncomeAlignmentRow[];
  // Step 3 — Retirement Buckets (fixed rows; "annual" values carry a "/year"
  // suffix; totals are summed here). Government has no monthly contribution.
  bucketGovernmentAnnual: string;
  bucketPersonalMonthly: string;
  bucketPersonalAnnual: string;
  bucketCorpLiquidMonthly: string;
  bucketCorpLiquidAnnual: string;
  bucketCorpFixedMonthly: string;
  bucketCorpFixedAnnual: string;
  bucketMonthlyTotal: string;
  bucketAnnualTotal: string;
  // Step 3 — Monthly Savings Allocation (fixed rows; total summed here).
  monthlySavingsPersonal: string;
  monthlySavingsCorpLiquid: string;
  monthlySavingsCorpFixed: string;
  monthlySavingsTotal: string;
  // Step 4 — Accounts & Education.
  // TFSA / RRSP / PPP: one row per client (loops).
  tfsa: AccountRow[];
  rrsp: AccountRow[];
  ppp: AccountRow[];
  // Corporate Liquid Bucket: MPC only, so single (non-loop) figures. The name
  // cell reuses {corporationName}.
  corpLiquidMonthly: string;
  corpLiquidEstimatedValue: string;
  // Corporate Fixed Bucket: contribution per client (loop) + "delivers" metrics.
  corporateFixed: CorporateFixedRow[];
  fixedAnnualTaxFreeIncome: string;
  fixedContributionPeriod: string;
  fixedEstateValue: string;
  fixedTotalLifetimeValue: string;
  // Education Funding: one row per child (loop) + auto-computed total.
  education: EducationRow[];
  educationTotal: string;
  // Plain list of children's names for education prose, e.g. "Emma and Liam".
  childrenList: string;
  // Step 5 — Insurance. One row per client (loops); the modifier is blank until
  // an amount is entered so empty rows don't show a stray term.
  termLife: InsuranceRow[];
  criticalIllness: InsuranceRow[];
  disability: InsuranceRow[];
  // Step 6 — Implementation (dynamic tables). Party keys resolved to names.
  transfersPersonal: RenderedTransferRow[];
  transfersCorporate: RenderedTransferRow[];
  fundingPersonal: RenderedFundingRow[];
  fundingCorporate: RenderedFundingRow[];
  monthlyPersonal: RenderedFundingRow[];
  monthlyCorporate: RenderedFundingRow[];
  // Step 2 — Goals & Success
  // Number as a string for "… by age {targetIndependenceAge}". "" when unset.
  targetIndependenceAge: string;
  // Profile "Retirement Goal" row: "Age 55" when a target age is set, else ""
  // (so the cell stays blank rather than showing a bare "Age ").
  retirementGoal: string;
  successRetirementIncome: string;
  successPassiveIncome: string;
  successLiquidCapital: string;
  successNetWorth: string;
  // Step 2 — Projected Access To Capital. Fixed year rows; each cell is the
  // formatted "Potential Capital Available" amount ("" when unset).
  accessCapitalYear2: string;
  accessCapitalYear4: string;
  accessCapitalYear6: string;
  accessCapitalYear8: string;
  accessCapitalYear10: string;
  // Step 3 — Projected Annual Retirement Income (Your Retirement Income Summary).
  // The two per-client sources loop one row per client (name reused from Step 1,
  // second client auto-dropped for a solo plan — same as governmentBenefits). The
  // remaining sources are single fixed rows. Total is the auto-summed annual-income
  // column; every amount is "" when unset.
  riCppOas: RetirementIncomeDocRow[];
  riTfsa: RetirementIncomeDocRow[];
  riPppIncome: string;
  riPppEstate: string;
  riCorpLiquidIncome: string;
  riCorpLiquidEstate: string;
  riCorpFixedIncome: string;
  riCorpFixedEstate: string;
  riTotalIncome: string;
}

// One rendered row of a per-client retirement-income source (CPP & OAS, TFSA):
// the client name plus the formatted annual income and expected estate value.
export interface RetirementIncomeDocRow {
  name: string;
  income: string;
  estate: string;
}

// The generating user's profile fields, as read from `profiles`. Nullable
// because the columns are optional; a missing field renders as an empty line.
export interface AdvisorInfo {
  name: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
}

// "DANIEL PESCADOR, ADVISOR" from name + position, matching the template's
// upper-cased "NAME, DESIGNATION" planner line. Position is appended after a
// comma (like "…, CFA"); with no name the line is "" so the block stays clean.
function formatAdvisorName(name: string | null, position: string | null): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  const p = (position ?? "").trim();
  return (p ? `${n}, ${p}` : n).toUpperCase();
}

function fullName(c: IflpClient): string {
  return [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
}

function hasClient(c: IflpClient): boolean {
  return Boolean(c.firstName.trim() || c.lastName.trim());
}

// Renders children as "Emma (10), Liam (7)" for the {children} tag. Kids with
// no name are skipped; a named child with no age falls back to just the name.
// No children -> "".
function formatChildren(children: IflpChild[]): string {
  return children
    .map((c) => {
      const name = c.firstName.trim();
      if (!name) return "";
      return c.age == null ? name : `${name} (${c.age})`;
    })
    .filter(Boolean)
    .join(", ");
}

// Named (non-empty) child first names, in order.
function childNames(children: IflpChild[]): string[] {
  return children.map((c) => c.firstName.trim()).filter(Boolean);
}

// Possessive list for the Family goal row: ["Emma","Liam"] -> "Emma and Liam’s",
// ["Emma"] -> "Emma’s". The apostrophe is a typographic ’ to match the template
// copy. No children -> "".
function formatChildrenPossessive(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]}’s`;
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} and ${last}’s`;
}

// Plain (non-possessive) name list for prose: ["Emma","Liam"] -> "Emma and Liam".
function formatNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}

// "$285,000" from 285000. Null -> "". Exported so the FFLP payload builder
// formats its currency fields identically (see src/lib/fflp-form.ts).
export function formatCurrency(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// "$1,200,000 annually" from (1200000, "annually"). No amount -> "" (the
// frequency alone is meaningless without a number). Exported so the persistence
// layer stores the identical composed string the document renders.
export function formatIncome(amount: number | null, frequency: IncomeFrequency): string {
  const money = formatCurrency(amount);
  return money ? `${money} ${frequency}` : "";
}

// "$285,000/year" for the Retirement Buckets "What It Delivers" column. Null -> "".
function formatPerYear(n: number | null): string {
  const money = formatCurrency(n);
  return money ? `${money}/year` : "";
}

// Sum, treating null as absent — returns null when every value is null so a
// blank table shows "" rather than "$0".
function sumOrNull(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

// "12 Years" from 12. Null -> "".
function formatYears(n: number | null): string {
  return n == null ? "" : `${n} Year${n === 1 ? "" : "s"}`;
}

// A registered-account table (TFSA/RRSP/PPP) as one row per client, reading the
// given contribution/value fields off each client.
function accountRows(
  state: IflpFormState,
  contribution: keyof IflpClient,
  estimatedValue: keyof IflpClient
): AccountRow[] {
  return clientRecords(state).map((c) => ({
    name: fullName(c),
    contribution: formatCurrency(c[contribution] as number | null),
    estimatedValue: formatCurrency(c[estimatedValue] as number | null),
  }));
}

// An insurance table as one row per client. The modifier (term/product) is only
// rendered once an amount is entered, so unfilled rows stay clean.
function insuranceRows(
  state: IflpFormState,
  amount: keyof IflpClient,
  modifier: keyof IflpClient
): InsuranceRow[] {
  return clientRecords(state).map((c) => {
    const value = c[amount] as number | null;
    return {
      name: fullName(c),
      amount: formatCurrency(value),
      modifier: value == null ? "" : (c[modifier] as string),
    };
  });
}

// Government benefit rows (one per client) plus the auto-computed total. The
// total is "" until at least one CPP/OAS amount is entered, so a blank table
// doesn't show "$0".
function buildGovernmentBenefits(state: IflpFormState): {
  rows: GovernmentBenefitRow[];
  total: string;
} {
  const clients = clientRecords(state);
  const rows = clients.map((c) => ({
    name: fullName(c),
    cpp: formatCurrency(c.cppAmount),
    oas: formatCurrency(c.oasAmount),
  }));
  const amounts = clients
    .flatMap((c) => [c.cppAmount, c.oasAmount])
    .filter((v): v is number => v != null);
  const total = amounts.length
    ? formatCurrency(amounts.reduce((sum, v) => sum + v, 0))
    : "";
  return { rows, total };
}

export function buildIflpDocPayload(
  state: IflpFormState,
  advisor?: AdvisorInfo
): IflpDocPayload {
  const c1 = state.client1;
  const c2 = state.client2;
  const c1Full = fullName(c1);
  const c2Full = fullName(c2);
  const bothClients = hasClient(c2);

  const coverClients = bothClients ? `${c1Full} & ${c2Full}` : c1Full;

  const greetingNames = bothClients
    ? `${c1.firstName.trim()}, ${c2.firstName.trim()}`
    : c1.firstName.trim();
  const welcomeGreeting = greetingNames ? `Dear ${greetingNames} & Family,` : "";

  // Subject + verb for the intro sentence, using first names for a warmer read.
  const c1First = c1.firstName.trim();
  const c2First = c2.firstName.trim();
  const clientsClause = bothClients
    ? `${c1First} and ${c2First} are`
    : c1First
    ? `${c1First} is`
    : "";

  const names = childNames(state.children);
  const govBenefits = buildGovernmentBenefits(state);

  const rb = state.retirementBuckets;
  const ms = state.monthlySavings;
  const ca = state.corporateAccounts;
  const ri = state.retirementIncome;
  const incomeAlignment = clientRecords(state).map((c) => ({
    name: fullName(c),
    salary: formatCurrency(c.incomeAlignmentSalary),
  }));

  // Retirement income: the two per-client sources (CPP & OAS, TFSA) as one row
  // per existing client, so a solo plan drops the second row (like every other
  // per-client table). cppOas1/tfsa1 pair with client 1, cppOas2/tfsa2 with
  // client 2; a client not present contributes no row (and no stale figure).
  const riIncomeClients = deriveClients(state);
  const riCppOasSources = [ri.cppOas1, ri.cppOas2];
  const riTfsaSources = [ri.tfsa1, ri.tfsa2];
  const riCppOas: RetirementIncomeDocRow[] = riIncomeClients.map((p, i) => ({
    name: p.name,
    income: formatCurrency(riCppOasSources[i].annualIncome),
    estate: formatCurrency(riCppOasSources[i].estateValue),
  }));
  const riTfsa: RetirementIncomeDocRow[] = riIncomeClients.map((p, i) => ({
    name: p.name,
    income: formatCurrency(riTfsaSources[i].annualIncome),
    estate: formatCurrency(riTfsaSources[i].estateValue),
  }));

  const educationChildren = state.children.filter((c) => c.firstName.trim());
  const education = educationChildren.map((c) => ({
    name: c.firstName.trim(),
    cost: formatCurrency(c.educationCost),
    years: formatYears(c.educationYearsAway),
  }));
  const educationTotal = formatCurrency(
    sumOrNull(educationChildren.map((c) => c.educationCost))
  );

  const corporateFixed = clientRecords(state).map((c) => ({
    name: fullName(c),
    contribution: formatCurrency(c.corporateFixedContribution),
  }));

  const methodLabel = (v: string): string =>
    v === "in_kind" ? "In-Kind" : v === "in_cash" ? "In-Cash" : "";
  const renderTransfers = (rows: TransferRow[]): RenderedTransferRow[] =>
    rows.map((r) => ({
      party: partyName(state, r.party as PartyKey),
      institution: r.institution.trim(),
      account: r.account,
      method: methodLabel(r.method),
      expectedTime: r.expectedTime.trim(),
    }));
  const renderFunding = (rows: FundingRow[]): RenderedFundingRow[] =>
    rows.map((r) => ({
      party: partyName(state, r.party as PartyKey),
      amount: formatCurrency(r.amount),
      bucket: r.bucket,
    }));

  const now = new Date();

  return {
    planMonth: state.planMonth.trim(),
    planYear: state.planYear ? String(state.planYear) : "",
    generationMonth: now
      .toLocaleString("en-US", { month: "long" })
      .toUpperCase(),
    generationYear: String(now.getFullYear()),
    advisorName: formatAdvisorName(advisor?.name ?? null, advisor?.position ?? null),
    advisorPhone: (advisor?.phone ?? "").trim(),
    advisorEmail: (advisor?.email ?? "").trim().toUpperCase(),
    client1Name: c1Full,
    client2Name: c2Full,
    welcomeGreeting,
    coverClients,
    corporationName: state.corporationName.trim(),
    client1Age: c1.age == null ? "" : String(c1.age),
    householdIncome: formatCurrency(state.householdIncome),
    priorities: state.priorities.join(", "),
    children: formatChildren(state.children),
    clientsClause,
    hasChildren: names.length > 0,
    childrenNames: formatChildrenPossessive(names),
    clients: deriveClients(state),
    parties: deriveParties(state),
    governmentBenefits: govBenefits.rows,
    governmentBenefitsTotal: govBenefits.total,
    incomeAlignment,
    bucketGovernmentAnnual: formatPerYear(rb.governmentAnnual),
    bucketPersonalMonthly: formatCurrency(rb.personalMonthly),
    bucketPersonalAnnual: formatPerYear(rb.personalAnnual),
    bucketCorpLiquidMonthly: formatCurrency(rb.corpLiquidMonthly),
    bucketCorpLiquidAnnual: formatPerYear(rb.corpLiquidAnnual),
    bucketCorpFixedMonthly: formatCurrency(rb.corpFixedMonthly),
    bucketCorpFixedAnnual: formatPerYear(rb.corpFixedAnnual),
    bucketMonthlyTotal: formatCurrency(
      sumOrNull([rb.personalMonthly, rb.corpLiquidMonthly, rb.corpFixedMonthly])
    ),
    bucketAnnualTotal: formatPerYear(
      sumOrNull([
        rb.governmentAnnual,
        rb.personalAnnual,
        rb.corpLiquidAnnual,
        rb.corpFixedAnnual,
      ])
    ),
    monthlySavingsPersonal: formatCurrency(ms.personal),
    monthlySavingsCorpLiquid: formatCurrency(ms.corpLiquid),
    monthlySavingsCorpFixed: formatCurrency(ms.corpFixed),
    monthlySavingsTotal: formatCurrency(
      sumOrNull([ms.personal, ms.corpLiquid, ms.corpFixed])
    ),
    tfsa: accountRows(state, "tfsaContribution", "tfsaEstimatedValue"),
    rrsp: accountRows(state, "rrspContribution", "rrspEstimatedValue"),
    ppp: accountRows(state, "pppContribution", "pppEstimatedValue"),
    corpLiquidMonthly: formatCurrency(ca.liquidMonthlyContribution),
    corpLiquidEstimatedValue: formatCurrency(ca.liquidEstimatedValue),
    corporateFixed,
    fixedAnnualTaxFreeIncome: formatCurrency(ca.fixedAnnualTaxFreeIncome),
    fixedContributionPeriod: formatYears(ca.fixedContributionPeriodYears),
    fixedEstateValue: formatCurrency(ca.fixedEstateValue),
    fixedTotalLifetimeValue: formatCurrency(ca.fixedTotalLifetimeValue),
    education,
    educationTotal,
    childrenList: formatNameList(names),
    termLife: insuranceRows(state, "termLifeCoverage", "termLifeTerm"),
    criticalIllness: insuranceRows(
      state,
      "criticalIllnessCoverage",
      "criticalIllnessProduct"
    ),
    disability: insuranceRows(
      state,
      "disabilityMonthlyBenefit",
      "disabilityBenefitTerm"
    ),
    transfersPersonal: renderTransfers(state.transfersPersonal),
    transfersCorporate: renderTransfers(state.transfersCorporate),
    fundingPersonal: renderFunding(state.fundingPersonal),
    fundingCorporate: renderFunding(state.fundingCorporate),
    monthlyPersonal: renderFunding(state.monthlyPersonal),
    monthlyCorporate: renderFunding(state.monthlyCorporate),
    targetIndependenceAge:
      state.targetIndependenceAge == null ? "" : String(state.targetIndependenceAge),
    retirementGoal:
      state.targetIndependenceAge == null ? "" : `Age ${state.targetIndependenceAge}`,
    successRetirementIncome: formatIncome(
      state.retirementIncomeAmount,
      state.retirementIncomeFrequency
    ),
    successPassiveIncome: formatIncome(
      state.passiveIncomeAmount,
      state.passiveIncomeFrequency
    ),
    successLiquidCapital: state.successLiquidCapital.trim(),
    successNetWorth: state.successNetWorth.trim(),
    accessCapitalYear2: formatCurrency(state.accessToCapital.year2),
    accessCapitalYear4: formatCurrency(state.accessToCapital.year4),
    accessCapitalYear6: formatCurrency(state.accessToCapital.year6),
    accessCapitalYear8: formatCurrency(state.accessToCapital.year8),
    accessCapitalYear10: formatCurrency(state.accessToCapital.year10),
    riCppOas: riCppOas,
    riTfsa: riTfsa,
    riPppIncome: formatCurrency(ri.personalPension.annualIncome),
    riPppEstate: formatCurrency(ri.personalPension.estateValue),
    riCorpLiquidIncome: formatCurrency(ri.corporateLiquid.annualIncome),
    riCorpLiquidEstate: formatCurrency(ri.corporateLiquid.estateValue),
    riCorpFixedIncome: formatCurrency(ri.corporateFixed.annualIncome),
    riCorpFixedEstate: formatCurrency(ri.corporateFixed.estateValue),
    riTotalIncome: formatCurrency(
      sumOrNull([
        ...riIncomeClients.map((_, i) => riCppOasSources[i].annualIncome),
        ...riIncomeClients.map((_, i) => riTfsaSources[i].annualIncome),
        ri.personalPension.annualIncome,
        ri.corporateLiquid.annualIncome,
        ri.corporateFixed.annualIncome,
      ])
    ),
  };
}
