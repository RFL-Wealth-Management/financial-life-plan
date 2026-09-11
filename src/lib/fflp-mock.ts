// Dev-only mock data for the FFLP wizard. Fills the FFLP-specific fields (the
// shared ones come from the base IFLP plan) so the form and generated document
// can be exercised without hand-typing. Wired to the "Generate Mock Data" button
// in FflpWizard, which only renders in development. Values mirror the template's
// sample figures so a mock render reproduces the reference document.
//
// Typed as FflpFormState on purpose: if a field is added/removed/renamed in
// fflp-form.ts, this mock stops compiling — a signal to update it.

import type { FflpFormState } from "@/lib/fflp-form";

export const mockFflpFormState: FflpFormState = {
  recommendedSalary: 250000,
  incomeStrategyNote:
    "Income is structured primarily through salary for consistency, with dividends for flexibility.",
  allocPersonal: 8266,
  allocCorporate: 20000,
  allocInsurance: 60800,
  pension1Monthly: 3500,
  pension1Annual: 101236,
  pension2Monthly: 3600,
  pension2Annual: 102170,
  corpMonthly: 20000,
  corpAnnual: 220000,
  corpEstate: 22468097,
  insuranceEstate: 12721515,
  insC1Monthly: 30400,
  insC1PeriodYears: 13,
  insC1TaxFreeAnnual: 281052,
  insC2Monthly: 30400,
  insC2PeriodYears: 13,
  insC2TaxFreeAnnual: 293158,
  insC1Duration: "Age 61–90 (30 yrs)",
  insC1TotalTaxFree: 8431000,
  insC1DeathBenefit: 5744000,
  insC1TotalValue: 14175000,
  insC1Return: "200%+",
  insC2Duration: "Age 61–90 (30 yrs)",
  insC2TotalTaxFree: 8795000,
  insC2DeathBenefit: 6978000,
  insC2TotalValue: 15773000,
  insC2Return: "234%",
  insTotalReturn: "217%",
  insSummaryLine: "4.7M contributed → ~$29.9M tax-free total value",
  ac2C1: 455078, ac2C2: 442140,
  ac4C1: 1052543, ac4C2: 1025208,
  ac6C1: 1796728, ac6C2: 1752842,
  ac8C1: 2667361, ac8C2: 2605959,
  ac10C1: 3647874, ac10C2: 3566778,
  edu1Target: 175518, edu1Horizon: 9, edu2Target: 184294, edu2Horizon: 10,
  edu1WrapContribution: 7000, edu1WrapDuration: 12,
  edu2WrapContribution: 7000, edu2WrapDuration: 12,
  edu1Yr1: 82473, edu1Yr2: 87957, edu1Yr3: 93966, edu1Yr4: 100542, edu1Yr5: 107702,
  edu2Yr1: 124622, edu2Yr2: 133667, edu2Yr3: 143406, edu2Yr4: 151319, edu2Yr5: 159691,
  edu1Age30: 177211, edu1Age40: 307636, edu1Age50: 539171, edu1Age65: 1244410, edu1Age90: 5989612,
  edu2Age30: 246874, edu2Age40: 431259, edu2Age50: 759034, edu2Age65: 1759464, edu2Age90: 8528978,
  implTransfers: [
    { account: "RBC TFSA", action: "Transfer", amount: "$150,000", destination: "RFL Managed TFSA" },
    { account: "Corporate Account", action: "Lump Sum Contribution", amount: "$250,000", destination: "Corporate Fixed Bucket" },
    { account: "RESP", action: "Transfer", amount: "TBD", destination: "RESP Strategy" },
  ],
  implMonthly: [
    { source: "Corporation", amount: 20000, allocatedTo: "Corporate Liquid Bucket" },
    { source: "Corporation", amount: 60800, allocatedTo: "Corporate Fixed Bucket" },
    { source: "Personal", amount: 7100, allocatedTo: "Personal Pension Plan" },
  ],
  implNextSteps: [
    { action: "RESP Transfer", status: "Pending", owner: "RFL + Client" },
    { action: "Corporate Contributions", status: "Ongoing", owner: "Client" },
    { action: "Insurance Funding", status: "Active", owner: "RFL" },
    { action: "Annual Review Meeting", status: "Scheduled Annually", owner: "RFL" },
  ],
  ciInPlace: false,
  diNewCoverage: false,
};
