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
  priorities: string;
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
