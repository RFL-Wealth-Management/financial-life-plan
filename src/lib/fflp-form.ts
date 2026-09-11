// FFLP wizard form state, and the mapping from that state (plus the base IFLP
// plan) to the flat tag payload docxtemplater renders into
// templates/fflp.tagged.docx.
//
// The FFLP reuses the IFLP plan as its base: shared tags (client names, dates,
// advisor block) come from buildIflpDocPayload, and only the FFLP-only fields
// live here. FFLP-only data is persisted as a single JSONB blob (plan_fflp.data),
// so the form can grow section by section without a migration per field. This
// module is client-safe (no fs) — docx-service imports only the payload type.
// See docs/fflp-tagging.md for the tag map.

import {
  buildIflpDocPayload,
  clientRecords,
  monthlyFromAnnual,
  type AdvisorInfo,
  type IflpDocPayload,
  type IflpFormState,
  type IflpStep,
} from "@/lib/iflp-form";
import { governmentBenefitsTotal } from "@/lib/iflp-derive";
import {
  moneyOrBlank as formatCurrency,
  perYearOrBlank as formatPerYear,
  sumOrNull,
} from "@/lib/format";

// ---------------------------------------------------------------------------
// Form state — FFLP-only fields (flat, so they bind directly to the field
// components and serialize cleanly to JSONB). Shared fields (clients, plan date,
// retirement age, advisor …) are NOT here; they come from the base IFLP plan.
// Most totals are derived in the payload, so only the leaf figures are stored.
// ---------------------------------------------------------------------------

// Step 6 — dynamic implementation tables. `amount` on a transfer is free text so
// it can hold "TBD" as well as a dollar figure; monthly contributions are always
// currency.
export interface FflpTransferRow {
  account: string;
  action: string;
  amount: string;
  destination: string;
}
export interface FflpMonthlyRow {
  source: string;
  amount: number | null;
  allocatedTo: string;
}
export interface FflpNextStepRow {
  action: string;
  status: string;
  owner: string;
}

export interface FflpFormState {
  // Step 1 — Income Strategy
  recommendedSalary: number | null;
  incomeStrategyNote: string;

  // Step 2 — Monthly Contributions & Allocation (total is derived)
  allocPersonal: number | null;
  allocCorporate: number | null;
  allocInsurance: number | null;

  // Step 3 — Government Bucket has no fields: CPP and OAS are entered once on
  // the IFLP's clients, annual, and the FFLP's monthly column is derived from
  // them. See buildFflpDocPayload.

  // Step 3 — Pension Bucket (PPP): monthly + projected annual income per client
  pension1Monthly: number | null;
  pension1Annual: number | null;
  pension2Monthly: number | null;
  pension2Annual: number | null;

  // Step 3 — Corporate Bucket (Liquid)
  corpMonthly: number | null;
  corpAnnual: number | null;

  // Step 3 — Estate values for the Retirement Income Summary (gov/pension are $0)
  corpEstate: number | null;
  insuranceEstate: number | null;

  // Step 4 — Insurance Bucket: Contributions & Outcomes (per client). The
  // monthly + tax-free-annual totals also drive the buckets and income summary,
  // so those are derived from these rather than entered twice.
  insC1Monthly: number | null;
  insC1PeriodYears: number | null;
  insC1TaxFreeAnnual: number | null;
  insC2Monthly: number | null;
  insC2PeriodYears: number | null;
  insC2TaxFreeAnnual: number | null;
  // Step 4 — Insurance Bucket: Detailed Outcome. Income duration and return are
  // presentation strings ("Age 61–90 (30 yrs)", "200%+"). The monetary figures
  // are numbers (dollars) so the totals can be summed; they render abbreviated
  // ("$8.431M") in the document.
  insC1Duration: string;
  insC1TotalTaxFree: number | null;
  insC1DeathBenefit: number | null;
  insC1TotalValue: number | null;
  insC1Return: string;
  insC2Duration: string;
  insC2TotalTaxFree: number | null;
  insC2DeathBenefit: number | null;
  insC2TotalValue: number | null;
  insC2Return: string;
  // Tax-free / death-benefit / total-value totals are DERIVED (sum of both
  // clients). Return is a blended ratio, not a sum, so it stays entered by hand.
  insTotalReturn: string;
  insSummaryLine: string;

  // Step 4 — Access to Capital (per client, per milestone year; totals derived)
  ac2C1: number | null; ac2C2: number | null;
  ac4C1: number | null; ac4C2: number | null;
  ac6C1: number | null; ac6C2: number | null;
  ac8C1: number | null; ac8C2: number | null;
  ac10C1: number | null; ac10C2: number | null;

  // Step 5 — Education (up to 2 children; names come from the IFLP's children).
  // Funding Overview
  edu1Target: number | null; edu1Horizon: number | null;
  edu2Target: number | null; edu2Horizon: number | null;
  // Insurance Wrapper (annual contribution + duration)
  edu1WrapContribution: number | null; edu1WrapDuration: number | null;
  edu2WrapContribution: number | null; edu2WrapDuration: number | null;
  // Contribution Overview — end of year 1–5
  edu1Yr1: number | null; edu1Yr2: number | null; edu1Yr3: number | null; edu1Yr4: number | null; edu1Yr5: number | null;
  edu2Yr1: number | null; edu2Yr2: number | null; edu2Yr3: number | null; edu2Yr4: number | null; edu2Yr5: number | null;
  // Projected Education Funding — ages 30/40/50/65/90
  edu1Age30: number | null; edu1Age40: number | null; edu1Age50: number | null; edu1Age65: number | null; edu1Age90: number | null;
  edu2Age30: number | null; edu2Age40: number | null; edu2Age50: number | null; edu2Age65: number | null; edu2Age90: number | null;

  // Step 6 — Implementation & Funding (dynamic add/remove tables)
  implTransfers: FflpTransferRow[];
  implMonthly: FflpMonthlyRow[];
  implNextSteps: FflpNextStepRow[];
  // Step 6 — Protection Planning status toggles. Each picks which of the two
  // mutually-exclusive template blocks renders.
  ciInPlace: boolean; // Critical Illness: in place (true) / not in place (false)
  diNewCoverage: boolean; // Disability: new coverage (true) / exists elsewhere (false)
}

export const initialFflpFormState: FflpFormState = {
  recommendedSalary: null,
  incomeStrategyNote: "",
  allocPersonal: null,
  allocCorporate: null,
  allocInsurance: null,
  pension1Monthly: null,
  pension1Annual: null,
  pension2Monthly: null,
  pension2Annual: null,
  corpMonthly: null,
  corpAnnual: null,
  corpEstate: null,
  insuranceEstate: null,
  insC1Monthly: null,
  insC1PeriodYears: null,
  insC1TaxFreeAnnual: null,
  insC2Monthly: null,
  insC2PeriodYears: null,
  insC2TaxFreeAnnual: null,
  insC1Duration: "",
  insC1TotalTaxFree: null,
  insC1DeathBenefit: null,
  insC1TotalValue: null,
  insC1Return: "",
  insC2Duration: "",
  insC2TotalTaxFree: null,
  insC2DeathBenefit: null,
  insC2TotalValue: null,
  insC2Return: "",
  insTotalReturn: "",
  insSummaryLine: "",
  ac2C1: null, ac2C2: null,
  ac4C1: null, ac4C2: null,
  ac6C1: null, ac6C2: null,
  ac8C1: null, ac8C2: null,
  ac10C1: null, ac10C2: null,
  edu1Target: null, edu1Horizon: null, edu2Target: null, edu2Horizon: null,
  edu1WrapContribution: null, edu1WrapDuration: null,
  edu2WrapContribution: null, edu2WrapDuration: null,
  edu1Yr1: null, edu1Yr2: null, edu1Yr3: null, edu1Yr4: null, edu1Yr5: null,
  edu2Yr1: null, edu2Yr2: null, edu2Yr3: null, edu2Yr4: null, edu2Yr5: null,
  edu1Age30: null, edu1Age40: null, edu1Age50: null, edu1Age65: null, edu1Age90: null,
  edu2Age30: null, edu2Age40: null, edu2Age50: null, edu2Age65: null, edu2Age90: null,
  implTransfers: [],
  implMonthly: [],
  implNextSteps: [],
  ciInPlace: false,
  diNewCoverage: false,
};

export const emptyTransferRow: FflpTransferRow = { account: "", action: "", amount: "", destination: "" };
export const emptyMonthlyRow: FflpMonthlyRow = { source: "", amount: null, allocatedTo: "" };
export const emptyNextStepRow: FflpNextStepRow = { action: "", status: "", owner: "" };

// ---------------------------------------------------------------------------
// Wizard steps. All six render real fields and feed buildFflpDocPayload below.
// Reordering this array is all it takes: the wizard renders by step id, not by
// position (same contract as IFLP_STEPS).
// ---------------------------------------------------------------------------

export const FFLP_STEPS: IflpStep[] = [
  { id: "profile", title: "Profile & Income", blurb: "Retirement age and recommended income structure." },
  { id: "contributions", title: "Contributions", blurb: "Total monthly investment and how it's allocated." },
  { id: "buckets", title: "Buckets & Income", blurb: "Government, pension, corporate, insurance, and income summary." },
  { id: "insurance", title: "Insurance & Capital", blurb: "Insurance outcomes and access to capital." },
  { id: "networth", title: "Net Worth & Education", blurb: "Projected net worth and education funding." },
  { id: "implementation", title: "Implementation", blurb: "Funding plan, protection, and next steps." },
];

// ---------------------------------------------------------------------------
// Document payload.
// ---------------------------------------------------------------------------

/**
 * The IFLP tags the FFLP template also uses — client names, the welcome
 * greeting and the advisor block. Taken from the base plan's payload so the two
 * documents cannot disagree about who the plan is for or who wrote it.
 *
 * Listed rather than spread. `{ ...buildIflpDocPayload(base) }` used to carry all
 * ninety-odd IFLP tags in, and a key declared in both payloads was then decided
 * purely by which line came last in the object literal. `riTotalIncome` is
 * exactly that case: it means "CPP/OAS + TFSA + PPP + corporate" in the IFLP and
 * "government + pension + corporate + insurance" here, and nothing said so. The
 * FFLP's value is the right one for the FFLP's table — but it should win because
 * it was chosen, not because of where it sat.
 *
 * Adding a name here is how a shared value becomes shared; the compiler then
 * requires it in `shared` below.
 */
type SharedTag =
  | "coverClients"
  | "client1Name"
  | "client2Name"
  | "welcomeGreeting"
  | "advisorName"
  | "advisorPhone"
  | "advisorEmail";

export interface FflpDocPayload extends Pick<IflpDocPayload, SharedTag> {
  // Cover + final-page date, e.g. "AUGUST 2026".
  coverDate: string;
  // Profile "Retirement Age" — the base IFLP's target independence age (shared).
  retirementAge: string;
  // Income Strategy "Recommended Structure" salary (FFLP-only).
  recommendedSalary: string;

  // Monthly Contributions & Allocation
  contribTotal: string;
  allocPersonal: string;
  allocCorporate: string;
  allocInsurance: string;

  // Retirement Buckets — At a Glance
  bucketsTotalIncome: string;
  bucketGovAnnual: string;
  bucketPensionMonthly: string;
  bucketPensionAnnual: string;
  bucketCorpMonthly: string;
  bucketCorpAnnual: string;
  bucketInsuranceMonthly: string;
  bucketInsuranceAnnual: string;

  // Government Bucket (per client, plus totals)
  govCpp1Monthly: string;
  govCpp1Annual: string;
  govCpp2Monthly: string;
  govCpp2Annual: string;
  govOas1Monthly: string;
  govOas1Annual: string;
  govOas2Monthly: string;
  govOas2Annual: string;
  govTotalMonthly: string;
  govTotalAnnual: string;

  // Pension Bucket (per client, plus totals)
  pension1Monthly: string;
  pension1Annual: string;
  pension2Monthly: string;
  pension2Annual: string;
  pensionTotalMonthly: string;
  pensionTotalAnnual: string;

  // Corporate Bucket
  corpMonthly: string;
  corpAnnual: string;

  // Retirement Income Summary
  riEstimatedAnnual: string;
  riGovIncome: string;
  riGovEstate: string;
  riPensionIncome: string;
  riPensionEstate: string;
  riCorpIncome: string;
  riCorpEstate: string;
  riInsuranceIncome: string;
  riInsuranceEstate: string;
  riTotalIncome: string;
  riTotalEstate: string;

  // Insurance Bucket — Contributions & Outcomes
  insC1Monthly: string;
  insC1Period: string;
  insC1TaxFreeAnnual: string;
  insC2Monthly: string;
  insC2Period: string;
  insC2TaxFreeAnnual: string;
  insTotalMonthly: string;
  insTotalTaxFreeAnnual: string;
  insSummaryLine: string;
  // Insurance Bucket — Detailed Outcome (free-text presentation values)
  insC1Duration: string;
  insC1TotalTaxFree: string;
  insC1DeathBenefit: string;
  insC1TotalValue: string;
  insC1Return: string;
  insC2Duration: string;
  insC2TotalTaxFree: string;
  insC2DeathBenefit: string;
  insC2TotalValue: string;
  insC2Return: string;
  insTotalTaxFree: string;
  insTotalDeathBenefit: string;
  insTotalValue: string;
  insTotalReturn: string;

  // Access to Capital (per client + derived totals, per milestone year)
  ac2C1: string; ac2C2: string; ac2Total: string;
  ac4C1: string; ac4C2: string; ac4Total: string;
  ac6C1: string; ac6C2: string; ac6Total: string;
  ac8C1: string; ac8C2: string; ac8Total: string;
  ac10C1: string; ac10C2: string; ac10Total: string;

  // Education (child names come from the IFLP; values are FFLP-only)
  eduChild1Name: string; eduChild2Name: string;
  edu1Target: string; edu1Horizon: string; edu2Target: string; edu2Horizon: string;
  edu1WrapContribution: string; edu1WrapDuration: string;
  edu2WrapContribution: string; edu2WrapDuration: string;
  edu1Yr1: string; edu1Yr2: string; edu1Yr3: string; edu1Yr4: string; edu1Yr5: string;
  edu2Yr1: string; edu2Yr2: string; edu2Yr3: string; edu2Yr4: string; edu2Yr5: string;
  edu1Age30: string; edu1Age40: string; edu1Age50: string; edu1Age65: string; edu1Age90: string;
  edu2Age30: string; edu2Age40: string; edu2Age50: string; edu2Age65: string; edu2Age90: string;

  // Implementation & Funding — loop-ready rows for the dynamic tables.
  implTransfers: { account: string; action: string; amount: string; destination: string }[];
  implMonthly: { source: string; amount: string; allocatedTo: string }[];
  implNextSteps: { action: string; status: string; owner: string }[];
  // Protection Planning — booleans gating the mutually-exclusive template blocks.
  ciInPlace: boolean;
  diNewCoverage: boolean;
}

// "$8.431M" from 8431000. Null -> "". The Insurance Detailed Outcome table shows
// figures abbreviated in millions.
function formatMillions(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "";
  return (
    "$" +
    (n / 1_000_000).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }) +
    "M"
  );
}

export function buildFflpDocPayload(
  base: IflpFormState,
  fflp: FflpFormState,
  advisor?: AdvisorInfo
): FflpDocPayload {
  // Only the tags SharedTag names cross over; see the note there for why this is
  // written out and not spread.
  const iflp = buildIflpDocPayload(base, advisor);
  const shared: Pick<IflpDocPayload, SharedTag> = {
    coverClients: iflp.coverClients,
    client1Name: iflp.client1Name,
    client2Name: iflp.client2Name,
    welcomeGreeting: iflp.welcomeGreeting,
    advisorName: iflp.advisorName,
    advisorPhone: iflp.advisorPhone,
    advisorEmail: iflp.advisorEmail,
  };

  const month = base.planMonth.trim();
  const coverDate =
    month && base.planYear ? `${month} ${base.planYear}`.toUpperCase() : "";

  const age = base.targetIndependenceAge;
  const c = formatCurrency;
  const s = fflp;

  // Government — read off the base plan rather than re-entered. CPP and OAS live
  // on the IFLP's clients and are stored ANNUAL (governmentBenefitsTotal: "already
  // annual figures, so there is no × 12 here"), while this table also prints a
  // monthly column. Collecting that column separately meant the same benefit was
  // typed into two forms in two units, a twelvefold disagreement away from each
  // other with nothing to catch it. The total is the IFLP's own selector, so the
  // two documents cannot report different government income.
  const govClients = clientRecords(base);
  const cpp1A = govClients[0]?.cppAmount ?? null;
  const cpp2A = govClients[1]?.cppAmount ?? null;
  const oas1A = govClients[0]?.oasAmount ?? null;
  const oas2A = govClients[1]?.oasAmount ?? null;
  const govTotalAnnual = governmentBenefitsTotal(base);
  const govTotalMonthly = monthlyFromAnnual(govTotalAnnual);

  // Pension totals.
  const pensionTotalMonthly = sumOrNull([s.pension1Monthly, s.pension2Monthly]);
  const pensionTotalAnnual = sumOrNull([s.pension1Annual, s.pension2Annual]);

  // Insurance totals (drive the bucket + income-summary rows too).
  const insMonthlyTotal = sumOrNull([s.insC1Monthly, s.insC2Monthly]);
  const insAnnualTotal = sumOrNull([s.insC1TaxFreeAnnual, s.insC2TaxFreeAnnual]);

  // Detailed Outcome totals — summed across the two clients (return is a ratio,
  // so it isn't summed; it comes straight from the entered value).
  const insTaxFreeTotal = sumOrNull([s.insC1TotalTaxFree, s.insC2TotalTaxFree]);
  const insDeathTotal = sumOrNull([s.insC1DeathBenefit, s.insC2DeathBenefit]);
  const insValueTotal = sumOrNull([s.insC1TotalValue, s.insC2TotalValue]);

  // Combined retirement income = the four buckets' annual income.
  const totalIncome = sumOrNull([
    govTotalAnnual, pensionTotalAnnual, s.corpAnnual, insAnnualTotal,
  ]);
  const totalEstate = sumOrNull([s.corpEstate, s.insuranceEstate]);

  // "20 years" / "1 year". Lower-case, unlike format.ts's formatYears, because
  // that is how the template's surrounding copy reads.
  const period = (y: number | null): string =>
    y == null ? "" : `${y} year${y === 1 ? "" : "s"}`;

  return {
    ...shared,
    coverDate,
    retirementAge: age == null ? "" : String(age),
    recommendedSalary: c(s.recommendedSalary),

    contribTotal: c(sumOrNull([s.allocPersonal, s.allocCorporate, s.allocInsurance])),
    allocPersonal: c(s.allocPersonal),
    allocCorporate: c(s.allocCorporate),
    allocInsurance: c(s.allocInsurance),

    bucketsTotalIncome: c(totalIncome),
    bucketGovAnnual: formatPerYear(govTotalAnnual),
    bucketPensionMonthly: c(pensionTotalMonthly),
    bucketPensionAnnual: formatPerYear(pensionTotalAnnual),
    bucketCorpMonthly: c(s.corpMonthly),
    bucketCorpAnnual: formatPerYear(s.corpAnnual),
    bucketInsuranceMonthly: c(insMonthlyTotal),
    bucketInsuranceAnnual: formatPerYear(insAnnualTotal),

    govCpp1Monthly: c(monthlyFromAnnual(cpp1A)),
    govCpp1Annual: c(cpp1A),
    govCpp2Monthly: c(monthlyFromAnnual(cpp2A)),
    govCpp2Annual: c(cpp2A),
    govOas1Monthly: c(monthlyFromAnnual(oas1A)),
    govOas1Annual: c(oas1A),
    govOas2Monthly: c(monthlyFromAnnual(oas2A)),
    govOas2Annual: c(oas2A),
    govTotalMonthly: c(govTotalMonthly),
    govTotalAnnual: c(govTotalAnnual),

    pension1Monthly: c(s.pension1Monthly),
    pension1Annual: c(s.pension1Annual),
    pension2Monthly: c(s.pension2Monthly),
    pension2Annual: c(s.pension2Annual),
    pensionTotalMonthly: c(pensionTotalMonthly),
    pensionTotalAnnual: c(pensionTotalAnnual),

    corpMonthly: c(s.corpMonthly),
    corpAnnual: c(s.corpAnnual),

    riEstimatedAnnual: c(totalIncome),
    riGovIncome: c(govTotalAnnual),
    riGovEstate: c(0),
    riPensionIncome: c(pensionTotalAnnual),
    riPensionEstate: c(0),
    riCorpIncome: c(s.corpAnnual),
    riCorpEstate: c(s.corpEstate),
    riInsuranceIncome: c(insAnnualTotal),
    riInsuranceEstate: c(s.insuranceEstate),
    riTotalIncome: c(totalIncome),
    riTotalEstate: c(totalEstate),

    insC1Monthly: c(s.insC1Monthly),
    insC1Period: period(s.insC1PeriodYears),
    insC1TaxFreeAnnual: c(s.insC1TaxFreeAnnual),
    insC2Monthly: c(s.insC2Monthly),
    insC2Period: period(s.insC2PeriodYears),
    insC2TaxFreeAnnual: c(s.insC2TaxFreeAnnual),
    insTotalMonthly: c(insMonthlyTotal),
    insTotalTaxFreeAnnual: c(insAnnualTotal),
    insSummaryLine: s.insSummaryLine.trim(),
    insC1Duration: s.insC1Duration.trim(),
    insC1TotalTaxFree: formatMillions(s.insC1TotalTaxFree),
    insC1DeathBenefit: formatMillions(s.insC1DeathBenefit),
    insC1TotalValue: formatMillions(s.insC1TotalValue),
    insC1Return: s.insC1Return.trim(),
    insC2Duration: s.insC2Duration.trim(),
    insC2TotalTaxFree: formatMillions(s.insC2TotalTaxFree),
    insC2DeathBenefit: formatMillions(s.insC2DeathBenefit),
    insC2TotalValue: formatMillions(s.insC2TotalValue),
    insC2Return: s.insC2Return.trim(),
    insTotalTaxFree: formatMillions(insTaxFreeTotal),
    insTotalDeathBenefit: formatMillions(insDeathTotal),
    insTotalValue: formatMillions(insValueTotal),
    insTotalReturn: s.insTotalReturn.trim(),

    ac2C1: c(s.ac2C1), ac2C2: c(s.ac2C2), ac2Total: c(sumOrNull([s.ac2C1, s.ac2C2])),
    ac4C1: c(s.ac4C1), ac4C2: c(s.ac4C2), ac4Total: c(sumOrNull([s.ac4C1, s.ac4C2])),
    ac6C1: c(s.ac6C1), ac6C2: c(s.ac6C2), ac6Total: c(sumOrNull([s.ac6C1, s.ac6C2])),
    ac8C1: c(s.ac8C1), ac8C2: c(s.ac8C2), ac8Total: c(sumOrNull([s.ac8C1, s.ac8C2])),
    ac10C1: c(s.ac10C1), ac10C2: c(s.ac10C2), ac10Total: c(sumOrNull([s.ac10C1, s.ac10C2])),

    eduChild1Name: base.children[0]?.firstName?.trim() ?? "",
    eduChild2Name: base.children[1]?.firstName?.trim() ?? "",
    edu1Target: c(s.edu1Target), edu1Horizon: period(s.edu1Horizon),
    edu2Target: c(s.edu2Target), edu2Horizon: period(s.edu2Horizon),
    edu1WrapContribution: c(s.edu1WrapContribution), edu1WrapDuration: period(s.edu1WrapDuration),
    edu2WrapContribution: c(s.edu2WrapContribution), edu2WrapDuration: period(s.edu2WrapDuration),
    edu1Yr1: c(s.edu1Yr1), edu1Yr2: c(s.edu1Yr2), edu1Yr3: c(s.edu1Yr3), edu1Yr4: c(s.edu1Yr4), edu1Yr5: c(s.edu1Yr5),
    edu2Yr1: c(s.edu2Yr1), edu2Yr2: c(s.edu2Yr2), edu2Yr3: c(s.edu2Yr3), edu2Yr4: c(s.edu2Yr4), edu2Yr5: c(s.edu2Yr5),
    edu1Age30: c(s.edu1Age30), edu1Age40: c(s.edu1Age40), edu1Age50: c(s.edu1Age50), edu1Age65: c(s.edu1Age65), edu1Age90: c(s.edu1Age90),
    edu2Age30: c(s.edu2Age30), edu2Age40: c(s.edu2Age40), edu2Age50: c(s.edu2Age50), edu2Age65: c(s.edu2Age65), edu2Age90: c(s.edu2Age90),

    implTransfers: s.implTransfers.map((r) => ({
      account: r.account.trim(),
      action: r.action.trim(),
      amount: r.amount.trim(),
      destination: r.destination.trim(),
    })),
    implMonthly: s.implMonthly.map((r) => ({
      source: r.source.trim(),
      amount: c(r.amount),
      allocatedTo: r.allocatedTo.trim(),
    })),
    implNextSteps: s.implNextSteps.map((r) => ({
      action: r.action.trim(),
      status: r.status.trim(),
      owner: r.owner.trim(),
    })),
    ciInPlace: s.ciInPlace,
    diNewCoverage: s.diNewCoverage,
  };
}
