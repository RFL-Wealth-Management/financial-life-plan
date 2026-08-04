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
    incomeAlignmentSalary: 180000,
    tfsaContribution: 7000,
    tfsaEstimatedValue: 210000,
    rrspContribution: 31560,
    rrspEstimatedValue: 640000,
    pppContribution: 42000,
    pppEstimatedValue: 890000,
    corporateFixedContribution: 50000,
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
    incomeAlignmentSalary: 120000,
    tfsaContribution: 7000,
    tfsaEstimatedValue: 185000,
    rrspContribution: 21600,
    rrspEstimatedValue: 410000,
    pppContribution: 0,
    pppEstimatedValue: 0,
    corporateFixedContribution: 30000,
    termLifeCoverage: 1500000,
    termLifeTerm: "30 Years",
    criticalIllnessCoverage: 350000,
    criticalIllnessProduct: "Living Benefit 75",
    disabilityMonthlyBenefit: 8000,
    disabilityBenefitTerm: "To Age 65",
  },
  children: [
    { firstName: "Emma", age: 10, educationCost: 120000, educationYearsAway: 8 },
    { firstName: "Liam", age: 7, educationCost: 120000, educationYearsAway: 11 },
  ],
  corporationName: "Pescador Holdings Inc.",
  householdIncome: 300000,
  priorities: ["retirement", "tax-efficiency", "education", "protection"],
  targetIndependenceAge: 55,
  retirementIncomeAmount: 1200000,
  retirementIncomeFrequency: "annually",
  passiveIncomeAmount: 300000,
  passiveIncomeFrequency: "annually",
  successLiquidCapital: "$5.0M+ available",
  successNetWorth: "$20.0M+",
  retirementBuckets: {
    governmentAnnual: 44500,
    personalMonthly: 2000,
    personalAnnual: 240000,
    corpLiquidMonthly: 1500,
    corpLiquidAnnual: 180000,
    corpFixedMonthly: 800,
    corpFixedAnnual: 96000,
  },
  monthlySavings: { personal: 2000, corpLiquid: 1500, corpFixed: 800 },
  corporateAccounts: {
    liquidMonthlyContribution: 1500,
    liquidEstimatedValue: 720000,
    fixedAnnualTaxFreeIncome: 150000,
    fixedContributionPeriodYears: 12,
    fixedEstateValue: 3500000,
    fixedTotalLifetimeValue: 8000000,
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
