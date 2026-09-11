"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileDown, FlaskConical, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import {
  TextInput,
  NumberInput,
  CurrencyInput,
  DerivedCurrency,
  SelectInput,
  SectionHeading,
} from "@/components/fields";
import {
  FFLP_STEPS,
  initialFflpFormState,
  emptyTransferRow,
  emptyMonthlyRow,
  emptyNextStepRow,
  type FflpFormState,
  type FflpTransferRow,
  type FflpMonthlyRow,
  type FflpNextStepRow,
} from "@/lib/fflp-form";
import { mockFflpFormState } from "@/lib/fflp-mock";
import { clientRecords, deriveClients, type IflpFormState } from "@/lib/iflp-form";
import { governmentBenefitsTotal } from "@/lib/iflp-derive";

/**
 * Column labels for the FFLP's fixed two-slot tables. The template gives each
 * per-client and per-child table exactly two columns, so slot 1 and slot 2
 * resolve to whoever the base IFLP actually names. A planner filling these in
 * should be reading the plan's own names rather than matching "Client 2" to a
 * person by memory.
 *
 * Slot 2 is `null` when the plan has no second person, and the steps render
 * nothing for it — the same rule deriveParties applies ("a solo plan yields a
 * single client and no phantom Client 2 row anywhere downstream"). Absence is
 * carried by the label itself so a caller cannot label a slot it isn't showing,
 * or show one it can't name.
 *
 * Values already stored against a hidden slot are deliberately left alone in
 * plan_fflp.data: adding the client back should restore the planner's figures
 * rather than having quietly discarded them.
 */
function slotLabels(names: string[], generic: string): [string, string | null] {
  return [names[0] || `${generic} 1`, names[1] || null];
}

/**
 * The FFLP wizard. Unlike the IFLP wizard it always edits an existing plan (the
 * FFLP extends a saved IFLP), so `planId` is required and the final action is an
 * upsert. All six steps render real fields; see docs/fflp-fields.md for the
 * inventory and docs/fflp-tagging.md for how each one reaches the document.
 *
 * `base` is the IFLP plan this FFLP extends. It is required rather than
 * optional: the FFLP duplicates around 31 of the plan's figures
 * (docs/fflp-iflp-overlap.md), and reconciling any of them needs the base state
 * here in the form, not only in the generate route.
 */
export function FflpWizard({
  planId,
  initialState,
  base,
}: {
  planId: string;
  initialState?: FflpFormState;
  base: IflpFormState;
}) {
  const router = useRouter();
  const { profile } = useSession();
  const isAdmin = profile.role === "admin";
  // Dev-only shortcuts, admin-only on top of that — dead-code-eliminated from
  // production builds. Mirrors the IFLP wizard's "Fill mock data" helper.
  const isDev = process.env.NODE_ENV === "development";
  const [state, setState] = useState<FflpFormState>(
    initialState ?? initialFflpFormState
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const step = FFLP_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === FFLP_STEPS.length - 1;

  // Who the plan's two client / child columns actually are. deriveClients drops
  // an unnamed client 2, so a solo plan falls back to the generic label rather
  // than inventing a person.
  const [c1Label, c2Label] = slotLabels(
    deriveClients(base).map((c) => c.firstName || c.name),
    "Client"
  );
  const [child1Label, child2Label] = slotLabels(
    base.children.map((c) => c.firstName.trim()).filter(Boolean),
    "Child"
  );

  function patch(update: Partial<FflpFormState>) {
    setState((s) => ({ ...s, ...update }));
  }

  async function handleGenerate() {
    setError("");
    setSaved(false);
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/generate/fflp?planId=${encodeURIComponent(planId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
      // The FFLP extras were persisted server-side before the document was built.
      setSaved(true);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FFLP-${base.client1.lastName.trim() || "draft"}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Progress */}
        <ol className="mb-8 flex items-stretch gap-2">
          {FFLP_STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={`text-left text-[11px] leading-tight transition-colors ${
                    active
                      ? "text-foreground font-medium"
                      : "text-foreground/45 hover:text-foreground/70"
                  }`}
                >
                  {s.title}
                </button>
                <div
                  className={`mt-auto h-1.5 rounded-full transition-colors ${
                    active ? "bg-accent" : done ? "bg-accent/50" : "bg-foreground/15"
                  }`}
                />
              </li>
            );
          })}
        </ol>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            FFLP · Step {stepIndex + 1} of {FFLP_STEPS.length}
          </p>
          <h1 className="mt-1 text-2xl font-heading font-bold text-foreground">
            {step.title}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">{step.blurb}</p>
        </div>

        {/* Step body */}
        <div className="space-y-6">
          {step.id === "profile" ? (
            <ProfileStep state={state} patch={patch} />
          ) : step.id === "contributions" ? (
            <ContributionsStep state={state} patch={patch} />
          ) : step.id === "buckets" ? (
            <BucketsStep state={state} patch={patch} c1={c1Label} c2={c2Label} base={base} />
          ) : step.id === "insurance" ? (
            <InsuranceStep state={state} patch={patch} c1={c1Label} c2={c2Label} />
          ) : step.id === "networth" ? (
            <EducationStep state={state} patch={patch} c1={child1Label} c2={child2Label} />
          ) : step.id === "implementation" ? (
            <ImplementationStep state={state} patch={patch} />
          ) : (
            <div className="rounded-lg border border-dashed border-foreground/20 bg-foreground/[0.02] px-4 py-10 text-center text-sm text-foreground/45">
              Fields for “{step.title}” are coming next. You can still generate the
              document to check what’s been filled so far.
            </div>
          )}
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {saved && !error && (
          <p className="mt-6 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            FFLP saved. Your document has been downloaded.
          </p>
        )}

        {/* Nav + generate */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-foreground/10 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden />
              Back
            </button>
            {isDev && isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setState(mockFflpFormState);
                    setError("");
                  }}
                  title="Dev only — fill the FFLP fields with sample data"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                >
                  <FlaskConical size={14} aria-hidden />
                  Generate Mock Data
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  title="Dev only — save and generate the FFLP from any step"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown size={14} aria-hidden />
                  Generate FFLP
                </button>
              </>
            )}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={16} aria-hidden />
              {generating ? "Saving…" : "Save & generate document"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStepIndex((i) => Math.min(FFLP_STEPS.length - 1, i + 1))
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground hover:brightness-105"
            >
              Next
              <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function ProfileStep({
  state,
  patch,
}: {
  state: FflpFormState;
  patch: (u: Partial<FflpFormState>) => void;
}) {
  return (
    <>
      <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground/60">
        Client names, plan date, retirement age, and the advisor block come from
        the saved IFLP — only the FFLP-specific fields are entered here.
      </p>

      <CurrencyInput
        id="fflp-recommended-salary"
        label="Recommended salary (per person)"
        prefix="$"
        value={state.recommendedSalary}
        onChange={(recommendedSalary) => patch({ recommendedSalary })}
      />

      <TextInput
        id="fflp-income-strategy-note"
        label="Income strategy note (optional)"
        value={state.incomeStrategyNote}
        onChange={(incomeStrategyNote) => patch({ incomeStrategyNote })}
      />
    </>
  );
}

// Small helper to keep the many currency rows terse. Defaults to the "$" addon
// prefix so every currency field across the FFLP steps shows it consistently.
function Money({
  id,
  label,
  value,
  onChange,
  prefix = "$",
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  prefix?: string;
}) {
  return (
    <CurrencyInput id={id} label={label} value={value} onChange={onChange} prefix={prefix} />
  );
}

function ContributionsStep({
  state,
  patch,
}: {
  state: FflpFormState;
  patch: (u: Partial<FflpFormState>) => void;
}) {
  return (
    <>
      <SectionHeading
        title="Monthly Contributions & Allocation"
        description="How the total monthly investment is split. The total is calculated for you."
      />
      <Money id="fflp-alloc-personal" label="Personal investments (monthly)" prefix="$" value={state.allocPersonal} onChange={(allocPersonal) => patch({ allocPersonal })} />
      <Money id="fflp-alloc-corporate" label="Corporate investments (monthly)" prefix="$" value={state.allocCorporate} onChange={(allocCorporate) => patch({ allocCorporate })} />
      <Money id="fflp-alloc-insurance" label="Insurance strategy (monthly)" prefix="$" value={state.allocInsurance} onChange={(allocInsurance) => patch({ allocInsurance })} />
    </>
  );
}

function BucketsStep({
  state,
  patch,
  c1,
  c2,
  base,
}: {
  state: FflpFormState;
  patch: (u: Partial<FflpFormState>) => void;
  /** Display labels for the two fixed columns; `c2` is null when the plan has
   *  no second person, and that column is not rendered (see slotLabels). */
  c1: string;
  c2: string | null;
  /** The IFLP this FFLP extends — the Government bucket reads off it. */
  base: IflpFormState;
}) {
  const govClients = clientRecords(base);
  return (
    <>
      <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground/60">
        Totals, the “at a glance” table, and the income summary are calculated from
        these figures. The Government bucket is read from the IFLP rather than
        entered here.
      </p>

      <SectionHeading title="Government Bucket" description="CPP & OAS come from the IFLP, where they are entered once per client as annual figures. The document's monthly column is derived from them." />
      <div className="grid grid-cols-2 gap-3">
        <DerivedCurrency id="fflp-cpp1" label={`CPP — ${c1} (annual)`} value={govClients[0]?.cppAmount ?? null} hint="from the IFLP" />
        {c2 && <DerivedCurrency id="fflp-cpp2" label={`CPP — ${c2} (annual)`} value={govClients[1]?.cppAmount ?? null} hint="from the IFLP" />}
        <DerivedCurrency id="fflp-oas1" label={`OAS — ${c1} (annual)`} value={govClients[0]?.oasAmount ?? null} hint="from the IFLP" />
        {c2 && <DerivedCurrency id="fflp-oas2" label={`OAS — ${c2} (annual)`} value={govClients[1]?.oasAmount ?? null} hint="from the IFLP" />}
      </div>
      <DerivedCurrency id="fflp-gov-total" label="Government total (annual)" value={governmentBenefitsTotal(base)} hint="CPP + OAS, every named client" />

      <SectionHeading title="Pension Bucket (PPP)" description="Monthly contribution and projected annual income per client." />
      <div className="grid grid-cols-2 gap-3">
        <Money id="fflp-ppp1-m" label={`${c1} — monthly`} value={state.pension1Monthly} onChange={(pension1Monthly) => patch({ pension1Monthly })} />
        <Money id="fflp-ppp1-a" label={`${c1} — annual income`} value={state.pension1Annual} onChange={(pension1Annual) => patch({ pension1Annual })} />
        {c2 && (
          <>
            <Money id="fflp-ppp2-m" label={`${c2} — monthly`} value={state.pension2Monthly} onChange={(pension2Monthly) => patch({ pension2Monthly })} />
            <Money id="fflp-ppp2-a" label={`${c2} — annual income`} value={state.pension2Annual} onChange={(pension2Annual) => patch({ pension2Annual })} />
          </>
        )}
      </div>

      <SectionHeading title="Corporate Bucket (Liquid)" description="Monthly contribution and estimated annual income at retirement." />
      <div className="grid grid-cols-2 gap-3">
        <Money id="fflp-corp-m" label="Monthly contribution" value={state.corpMonthly} onChange={(corpMonthly) => patch({ corpMonthly })} />
        <Money id="fflp-corp-a" label="Annual income" value={state.corpAnnual} onChange={(corpAnnual) => patch({ corpAnnual })} />
      </div>

      <SectionHeading title="Estate Values" description="Expected estate value per bucket for the income summary (government & pension are $0). Insurance figures are entered in the next step." />
      <div className="grid grid-cols-2 gap-3">
        <Money id="fflp-corp-estate" label="Corporate (Liquid) estate" value={state.corpEstate} onChange={(corpEstate) => patch({ corpEstate })} />
        <Money id="fflp-ins-estate" label="Insurance (Tax-Free) estate" value={state.insuranceEstate} onChange={(insuranceEstate) => patch({ insuranceEstate })} />
      </div>
    </>
  );
}

function InsuranceStep({
  state,
  patch,
  c1,
  c2,
}: {
  state: FflpFormState;
  patch: (u: Partial<FflpFormState>) => void;
  /** Display labels for the two fixed columns; `c2` is null when the plan has
   *  no second person, and that column is not rendered (see slotLabels). */
  c1: string;
  c2: string | null;
}) {
  return (
    <>
      <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground/60">
        Insurance monthly/annual totals flow into the buckets and income summary.
        The Detailed Outcome figures are shown exactly as typed (e.g. “$8.431M”,
        “200%+”). Access-to-capital totals are calculated per year.
      </p>

      <SectionHeading title="Insurance — Contributions & Outcomes" description="Per client: monthly contribution, contribution period, annual tax-free income." />
      <div className="grid grid-cols-3 gap-3">
        <Money id="fflp-insc1-m" label={`${c1} — monthly`} value={state.insC1Monthly} onChange={(insC1Monthly) => patch({ insC1Monthly })} />
        <NumberInput id="fflp-insc1-p" label={`${c1} — period (yrs)`} value={state.insC1PeriodYears} onChange={(insC1PeriodYears) => patch({ insC1PeriodYears })} />
        <Money id="fflp-insc1-a" label={`${c1} — tax-free/yr`} value={state.insC1TaxFreeAnnual} onChange={(insC1TaxFreeAnnual) => patch({ insC1TaxFreeAnnual })} />
        {c2 && (
          <>
            <Money id="fflp-insc2-m" label={`${c2} — monthly`} value={state.insC2Monthly} onChange={(insC2Monthly) => patch({ insC2Monthly })} />
            <NumberInput id="fflp-insc2-p" label={`${c2} — period (yrs)`} value={state.insC2PeriodYears} onChange={(insC2PeriodYears) => patch({ insC2PeriodYears })} />
            <Money id="fflp-insc2-a" label={`${c2} — tax-free/yr`} value={state.insC2TaxFreeAnnual} onChange={(insC2TaxFreeAnnual) => patch({ insC2TaxFreeAnnual })} />
          </>
        )}
      </div>

      <SectionHeading title="Insurance — Detailed Outcome" description="Monetary figures are entered in dollars and shown abbreviated (e.g. $8.431M) in the document. Income duration and return are free text (e.g. “Age 61–90 (30 yrs)”, “200%+”)." />
      <p className="text-xs font-semibold text-foreground/70">{c1}</p>
      <div className="grid grid-cols-2 gap-3">
        <TextInput id="fflp-insc1-dur" label="Income duration" value={state.insC1Duration} onChange={(insC1Duration) => patch({ insC1Duration })} />
        <Money id="fflp-insc1-tf" label="Total tax-free income" value={state.insC1TotalTaxFree} onChange={(insC1TotalTaxFree) => patch({ insC1TotalTaxFree })} />
        <Money id="fflp-insc1-db" label="Death benefit" value={state.insC1DeathBenefit} onChange={(insC1DeathBenefit) => patch({ insC1DeathBenefit })} />
        <Money id="fflp-insc1-tv" label="Total value" value={state.insC1TotalValue} onChange={(insC1TotalValue) => patch({ insC1TotalValue })} />
        <TextInput id="fflp-insc1-ret" label="Return" value={state.insC1Return} onChange={(insC1Return) => patch({ insC1Return })} />
      </div>
      {c2 && (
        <>
          <p className="text-xs font-semibold text-foreground/70">{c2}</p>
          <div className="grid grid-cols-2 gap-3">
            <TextInput id="fflp-insc2-dur" label="Income duration" value={state.insC2Duration} onChange={(insC2Duration) => patch({ insC2Duration })} />
            <Money id="fflp-insc2-tf" label="Total tax-free income" value={state.insC2TotalTaxFree} onChange={(insC2TotalTaxFree) => patch({ insC2TotalTaxFree })} />
            <Money id="fflp-insc2-db" label="Death benefit" value={state.insC2DeathBenefit} onChange={(insC2DeathBenefit) => patch({ insC2DeathBenefit })} />
            <Money id="fflp-insc2-tv" label="Total value" value={state.insC2TotalValue} onChange={(insC2TotalValue) => patch({ insC2TotalValue })} />
            <TextInput id="fflp-insc2-ret" label="Return" value={state.insC2Return} onChange={(insC2Return) => patch({ insC2Return })} />
          </div>
        </>
      )}
      <p className="text-xs font-semibold text-foreground/70">Totals</p>
      <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground/60">
        Total tax-free income, total death benefit, and total value are calculated
        from the {c2 ? "two clients" : "figures"} above. Only{" "}
        <strong>Total return</strong> is entered by hand, since a blended return
        isn’t a sum.
      </p>
      <TextInput id="fflp-inst-ret" label="Total return" value={state.insTotalReturn} onChange={(insTotalReturn) => patch({ insTotalReturn })} />
      <TextInput id="fflp-ins-summary" label="Summary line" value={state.insSummaryLine} onChange={(insSummaryLine) => patch({ insSummaryLine })} />

      <SectionHeading title="Access to Capital" description="Available capital per client at years 2 / 4 / 6 / 8 / 10. Totals are calculated." />
      {([
        ["2", "ac2C1", "ac2C2"],
        ["4", "ac4C1", "ac4C2"],
        ["6", "ac6C1", "ac6C2"],
        ["8", "ac8C1", "ac8C2"],
        ["10", "ac10C1", "ac10C2"],
      ] as const).map(([yr, k1, k2]) => (
        <div key={yr} className="grid grid-cols-2 gap-3">
          <Money id={`fflp-ac${yr}-1`} label={`Year ${yr} — ${c1}`} value={state[k1]} onChange={(v) => patch({ [k1]: v } as Partial<FflpFormState>)} />
          {c2 && <Money id={`fflp-ac${yr}-2`} label={`Year ${yr} — ${c2}`} value={state[k2]} onChange={(v) => patch({ [k2]: v } as Partial<FflpFormState>)} />}
        </div>
      ))}
    </>
  );
}

function EducationStep({
  state,
  patch,
  c1,
  c2,
}: {
  state: FflpFormState;
  patch: (u: Partial<FflpFormState>) => void;
  /** Display labels for the two fixed columns; `c2` is null when the plan has
   *  no second person, and that column is not rendered (see slotLabels). */
  c1: string;
  c2: string | null;
}) {
  // Child columns keyed 1/2; names come from the IFLP's children. Each row is a
  // labelled pair of inputs so the many education figures stay compact. The grid
  // narrows with the second column so a one-child plan doesn't leave a gap where
  // child 2 used to be.
  const cols = c2 ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_1fr]";
  const row = (
    label: string,
    k1: keyof FflpFormState,
    k2: keyof FflpFormState,
    kind: "money" | "years" = "money"
  ) => (
    <div className={`grid ${cols} items-end gap-3`}>
      <span className="pb-2 text-xs text-foreground/60">{label}</span>
      {kind === "money" ? (
        <>
          <Money id={`fflp-${String(k1)}`} label={c1} value={state[k1] as number | null} onChange={(v) => patch({ [k1]: v } as Partial<FflpFormState>)} />
          {c2 && <Money id={`fflp-${String(k2)}`} label={c2} value={state[k2] as number | null} onChange={(v) => patch({ [k2]: v } as Partial<FflpFormState>)} />}
        </>
      ) : (
        <>
          <NumberInput id={`fflp-${String(k1)}`} label={`${c1} (yrs)`} value={state[k1] as number | null} onChange={(v) => patch({ [k1]: v } as Partial<FflpFormState>)} />
          {c2 && <NumberInput id={`fflp-${String(k2)}`} label={`${c2} (yrs)`} value={state[k2] as number | null} onChange={(v) => patch({ [k2]: v } as Partial<FflpFormState>)} />}
        </>
      )}
    </div>
  );

  return (
    <>
      <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground/60">
        Child names come from the IFLP (up to two). Expected Net Worth is narrative
        in the document, so it has no fields here.
      </p>

      <SectionHeading title="Funding Overview" description="Funding target and time horizon per child." />
      {row("Funding target", "edu1Target", "edu2Target")}
      {row("Time horizon", "edu1Horizon", "edu2Horizon", "years")}

      <SectionHeading title="Insurance Wrapper" description="Annual contribution and duration per child." />
      {row("Annual contribution", "edu1WrapContribution", "edu2WrapContribution")}
      {row("Duration", "edu1WrapDuration", "edu2WrapDuration", "years")}

      <SectionHeading title="Contribution Overview" description="Projected value at the end of years 1–5." />
      {row("End of year 1", "edu1Yr1", "edu2Yr1")}
      {row("End of year 2", "edu1Yr2", "edu2Yr2")}
      {row("End of year 3", "edu1Yr3", "edu2Yr3")}
      {row("End of year 4", "edu1Yr4", "edu2Yr4")}
      {row("End of year 5", "edu1Yr5", "edu2Yr5")}

      <SectionHeading title="Projected Education Funding" description="Projected value at each age milestone." />
      {row("Age 30", "edu1Age30", "edu2Age30")}
      {row("Age 40", "edu1Age40", "edu2Age40")}
      {row("Age 50", "edu1Age50", "edu2Age50")}
      {row("Age 65", "edu1Age65", "edu2Age65")}
      {row("Age 90 (estate)", "edu1Age90", "edu2Age90")}
    </>
  );
}

function ImplementationStep({
  state,
  patch,
}: {
  state: FflpFormState;
  patch: (u: Partial<FflpFormState>) => void;
}) {
  // Generic add/update/remove for the three dynamic tables.
  function addRow<K extends "implTransfers" | "implMonthly" | "implNextSteps">(
    key: K,
    empty: FflpFormState[K][number]
  ) {
    patch({ [key]: [...state[key], { ...empty }] } as Partial<FflpFormState>);
  }
  function updateRow<K extends "implTransfers" | "implMonthly" | "implNextSteps">(
    key: K,
    i: number,
    update: Partial<FflpFormState[K][number]>
  ) {
    const rows = state[key].map((r, idx) => (idx === i ? { ...r, ...update } : r));
    patch({ [key]: rows } as Partial<FflpFormState>);
  }
  function removeRow<K extends "implTransfers" | "implMonthly" | "implNextSteps">(
    key: K,
    i: number
  ) {
    patch({ [key]: state[key].filter((_, idx) => idx !== i) } as Partial<FflpFormState>);
  }

  const addBtn = "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-accent/40 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-accent/10";
  const delBtn = "shrink-0 rounded-lg p-2 text-foreground/40 hover:bg-red-50 hover:text-red-600";

  return (
    <>
      <SectionHeading title="Transfers & Lump Sum Contributions" description="Transfers and one-time contributions required to activate the plan." />
      {state.implTransfers.map((r: FflpTransferRow, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <TextInput id={`tr-acc-${i}`} label="Account / Institution" value={r.account} onChange={(account) => updateRow("implTransfers", i, { account })} />
            <TextInput id={`tr-act-${i}`} label="Action required" value={r.action} onChange={(action) => updateRow("implTransfers", i, { action })} />
            <TextInput id={`tr-amt-${i}`} label="Amount (or “TBD”)" value={r.amount} onChange={(amount) => updateRow("implTransfers", i, { amount })} />
            <TextInput id={`tr-dst-${i}`} label="Destination" value={r.destination} onChange={(destination) => updateRow("implTransfers", i, { destination })} />
          </div>
          <button type="button" onClick={() => removeRow("implTransfers", i)} className={delBtn} title="Remove row">
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addRow("implTransfers", emptyTransferRow)} className={addBtn}>
        <Plus size={14} aria-hidden /> Add transfer
      </button>

      <SectionHeading title="Ongoing Monthly Contributions" description="Recurring contributions that keep the plan aligned." />
      {state.implMonthly.map((r: FflpMonthlyRow, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-3 gap-2">
            <TextInput id={`mo-src-${i}`} label="Source" value={r.source} onChange={(source) => updateRow("implMonthly", i, { source })} />
            <CurrencyInput id={`mo-amt-${i}`} label="Monthly" prefix="$" value={r.amount} onChange={(amount) => updateRow("implMonthly", i, { amount })} />
            <TextInput id={`mo-to-${i}`} label="Allocated to" value={r.allocatedTo} onChange={(allocatedTo) => updateRow("implMonthly", i, { allocatedTo })} />
          </div>
          <button type="button" onClick={() => removeRow("implMonthly", i)} className={delBtn} title="Remove row">
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addRow("implMonthly", emptyMonthlyRow)} className={addBtn}>
        <Plus size={14} aria-hidden /> Add contribution
      </button>

      <SectionHeading title="Protection Planning" description="Pick the status for each — the document renders the matching block." />
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          id="fflp-ci-status"
          label="Critical Illness"
          value={state.ciInPlace ? "in" : "not"}
          onChange={(v) => patch({ ciInPlace: v === "in" })}
          options={[
            { label: "Not in place", value: "not" },
            { label: "In place", value: "in" },
          ]}
        />
        <SelectInput
          id="fflp-di-status"
          label="Disability"
          value={state.diNewCoverage ? "new" : "elsewhere"}
          onChange={(v) => patch({ diNewCoverage: v === "new" })}
          options={[
            { label: "Coverage exists elsewhere", value: "elsewhere" },
            { label: "New coverage implemented", value: "new" },
          ]}
        />
      </div>

      <SectionHeading title="Next Steps" description="Action items to fully implement the plan." />
      {state.implNextSteps.map((r: FflpNextStepRow, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-3 gap-2">
            <TextInput id={`ns-act-${i}`} label="Action item" value={r.action} onChange={(action) => updateRow("implNextSteps", i, { action })} />
            <TextInput id={`ns-st-${i}`} label="Status" value={r.status} onChange={(status) => updateRow("implNextSteps", i, { status })} />
            <TextInput id={`ns-ow-${i}`} label="Owner" value={r.owner} onChange={(owner) => updateRow("implNextSteps", i, { owner })} />
          </div>
          <button type="button" onClick={() => removeRow("implNextSteps", i)} className={delBtn} title="Remove row">
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addRow("implNextSteps", emptyNextStepRow)} className={addBtn}>
        <Plus size={14} aria-hidden /> Add next step
      </button>
    </>
  );
}
