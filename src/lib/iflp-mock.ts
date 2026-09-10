// Dev-only mock data for the IFLP wizard. Fills every field across all six
// steps with realistic figures so the form (and the generated document) can be
// exercised end-to-end without hand-typing. Wired to the "Fill mock data"
// button in IflpWizard, which only renders in development.
//
// This is typed as IflpFormState on purpose: if a field is added, removed, or
// renamed in iflp-form.ts, this mock stops compiling — a signal to update it
// rather than let it drift.

import type { IflpFormState } from "@/lib/iflp-form";

export const mockIflpFormState: IflpFormState = {
  planMonth: "August",
  planYear: 2026,
  client1: {
    firstName: "Daniel",
    lastName: "Pescador",
    age: 42,
    cppAmount: 15000,
    oasAmount: 8000,
    incomeStructure: "salary",
    incomeAlignmentAmount: 180000,
    tfsaMonthlyContribution: 583,
    tfsaEstimatedValue: 210000,
    rrspMonthlyContribution: 2630,
    rrspEstimatedValue: 640000,
    pppMonthlyContribution: 3500,
    pppEstimatedValue: 890000,
    corporateFixedMonthlyContribution: 4167,
    termLifeCoverage: 2000000,
    termLifeTerm: "30 Years",
    criticalIllnessCoverage: 500000,
    criticalIllnessProduct: "Living Benefit 75",
    disabilityMonthlyBenefit: 12000,
    disabilityBenefitTerm: "To Age 65",
  },
  client2: {
    firstName: "Sofia",
    lastName: "Pescador",
    age: 39,
    cppAmount: 13500,
    oasAmount: 8000,
    incomeStructure: "dividend",
    incomeAlignmentAmount: 120000,
    tfsaMonthlyContribution: 583,
    tfsaEstimatedValue: 185000,
    rrspMonthlyContribution: 1800,
    rrspEstimatedValue: 410000,
    pppMonthlyContribution: 0,
    pppEstimatedValue: 0,
    corporateFixedMonthlyContribution: 2500,
    termLifeCoverage: 1500000,
    termLifeTerm: "30 Years",
    criticalIllnessCoverage: 350000,
    criticalIllnessProduct: "Living Benefit 75",
    disabilityMonthlyBenefit: 8000,
    disabilityBenefitTerm: "To Age 65",
  },
  children: [
    {
      firstName: "Emma",
      lastName: "Pescador",
      age: 10,
      educationCost: 120000,
      educationYearsAway: 8,
    },
    {
      firstName: "Liam",
      lastName: "Pescador",
      age: 7,
      educationCost: 120000,
      educationYearsAway: 11,
    },
  ],
  corporationName: "Pescador Holdings Inc.",
  householdIncome: 300000,
  priorities: ["retirement", "tax-efficiency", "education", "protection"],
  otherPriorities: [
    {
      name: "Charitable Giving",
      outcome: "Fund an annual gift without reducing retirement income",
    },
  ],
  targetIndependenceAge: 55,
  accessToCapital: {
    year2: 250000,
    year4: 1200000,
    year6: 2400000,
    year8: 3800000,
    year10: 5500000,
  },
  retirementIncome: {
    cppOas1: { annualIncome: 23000, estateValue: 0 },
    cppOas2: { annualIncome: 21500, estateValue: 0 },
    tfsa1: { annualIncome: 18000, estateValue: 210000 },
    tfsa2: { annualIncome: 15000, estateValue: 185000 },
    personalPension: { annualIncome: 95000, estateValue: 1200000 },
    corporateLiquid: { estateValue: 720000 },
    corporateFixed: { annualIncome: 150000, estateValue: 3500000 },
  },
  retirementBuckets: {
    personalMonthly: 2000,
    personalAnnual: 240000,
    corpLiquidMonthly: 1500,
    corpFixedMonthly: 800,
  },
  monthlySavings: { personal: 2000 },
  corporateAccounts: {
    liquidMonthlyContribution: 1500,
    liquidEstimatedValue: 720000,
    liquidRetirementIncome: 60000,
    fixedAnnualTaxFreeIncome: 150000,
    fixedContributionPeriodYears: 12,
    fixedEstateValue: 3500000,
    fixedTotalLifetimeValue: 8000000,
  },
  // Deliberately mixed rather than all-true, so exercising the mock shows both
  // an included and an excluded account rather than only the happy path.
  planOptions: {
    includeTfsa: true,
    includeRrsp: true,
    includeFhsa: false,
    includeNonRegistered: false,
    includePension: true,
    pensionType: "ppp",
  },
  transfersPersonal: [
    {
      party: "client1",
      institution: "CIBC",
      account: "TFSA",
      method: "in_kind",
      expectedTime: "2-4 weeks",
    },
  ],
  transfersCorporate: [
    {
      party: "corporation",
      institution: "RBC",
      account: "TFSA",
      method: "in_cash",
      expectedTime: "3-6 weeks",
    },
  ],
  fundingPersonal: [
    { party: "client1", amount: 100000, bucket: "TFSA" },
    { party: "client2", amount: 75000, bucket: "TFSA" },
  ],
  fundingCorporate: [
    { party: "corporation", amount: 500000, bucket: "Corporate Liquid Bucket" },
  ],
  monthlyPersonal: [{ party: "client1", amount: 2000, bucket: "TFSA" }],
  monthlyCorporate: [
    { party: "corporation", amount: 1500, bucket: "Corporate Liquid Bucket" },
  ],
};
