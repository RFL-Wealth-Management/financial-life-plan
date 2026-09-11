"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileDown,
  FlaskConical,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import {
  TextInput,
  NumberInput,
  CurrencyInput,
  DerivedCurrency,
  SelectInput,
  MonthYearPicker,
  TagInput,
  CollapsibleSection,
} from "@/components/fields";
import {
  priorityOptions,
  incomeStructureOptions,
  termLengthOptions,
  criticalIllnessProductOptions,
  benefitTermOptions,
  transferAccountOptions,
  transferMethodOptions,
  fundingBucketOptions,
} from "@/lib/field-options";
import {
  ACCOUNT_KINDS,
  IFLP_STEPS,
  sourceHint,
  annualFromMonthly,
  emptyAccountRow,
  partyName,
  initialIflpFormState,
  emptyChild,
  emptyOtherPriority,
  emptyTransferRow,
  emptyFundingRow,
  deriveClients,
  partyOptions,
  type AccountKind,
  type AccountRow,
  type IflpChild,
  type IflpClient,
  type PartyKey,
  type OtherPriority,
  type IflpFormState,
  type IncomeStructure,
  type RetirementBucketsInput,
  type AccessToCapitalInput,
  type RetirementIncomeInput,
  type RetirementIncomeSource,
  type CorporateAccountsInput,
  type TransferRow,
  type FundingRow,
} from "@/lib/iflp-form";
import { moneyOrDash } from "@/lib/format";
import {
  bucketAnnualTotal,
  bucketMonthlyTotal,
  personalSavingsMonthly,
  corporateFixedDelivers,
  corporateLiquidIncome,
  governmentDelivers,
  monthlySavingsCorpFixed,
  monthlySavingsCorpLiquid,
  educationTotal,
  governmentBenefitsTotal,
  monthlySavingsTotal,
  retirementIncomeTotal,
} from "@/lib/iflp-derive";
import { mockIflpFormState } from "@/lib/iflp-mock";

export function IflpWizard({
  initialState,
  planId,
}: {
  // Prefilled state + the plan being edited. Omitted for a brand-new report.
  initialState?: IflpFormState;
  planId?: string;
} = {}) {
  const router = useRouter();
  const { profile } = useSession();
  const isAdmin = profile.role === "admin";
  const isEditing = Boolean(planId);
  const [state, setState] = useState<IflpFormState>(
    initialState ?? initialIflpFormState
  );
  const [stepIndex, setStepIndex] = useState(0);
  // Each step is a fresh page of the form, so moving between them scrolls back
  // to the step header. Without this the planner lands mid-form on the next
  // step, at whatever offset the previous one was scrolled to.
  const topRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const step = IFLP_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === IFLP_STEPS.length - 1;
  // Dev-only shortcut, and admin-only on top of that — a regular user never sees
  // it even in a dev build. Still dead-code-eliminated from production.
  const isDev = process.env.NODE_ENV === "development";

  // Requirements before a document can be generated. Guarded on the button
  // here; the API enforces the same rules. `generateBlockedReason` is empty
  // once everything required is present.
  const hasClient = Boolean(
    state.client1.firstName.trim() || state.client1.lastName.trim()
  );
  const hasTargetAge = state.targetIndependenceAge != null;
  const generateBlockedReason = !hasClient
    ? "Add Client 1’s name before generating the document."
    : !hasTargetAge
      ? "Add the target independence age before generating the document."
      : "";
  const canGenerate = generateBlockedReason === "";

  // The single way to change steps: set the index, then anchor to the top.
  // scrollIntoView rather than window.scrollTo, so it keeps working if the form
  // ever moves into its own scroll container.
  function goToStep(next: number) {
    setStepIndex(Math.min(Math.max(next, 0), IFLP_STEPS.length - 1));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function patch(update: Partial<IflpFormState>) {
    setState((s) => ({ ...s, ...update }));
  }
  function patchClient(key: "client1" | "client2", update: Partial<IflpClient>) {
    setState((s) => ({ ...s, [key]: { ...s[key], ...update } }));
  }
  function addChild() {
    setState((s) => ({ ...s, children: [...s.children, { ...emptyChild }] }));
  }
  function updateChild(index: number, update: Partial<IflpChild>) {
    setState((s) => ({
      ...s,
      children: s.children.map((c, i) => (i === index ? { ...c, ...update } : c)),
    }));
  }
  function removeChild(index: number) {
    setState((s) => ({
      ...s,
      children: s.children.filter((_, i) => i !== index),
    }));
  }
  function addOtherPriority() {
    setState((s) => ({
      ...s,
      otherPriorities: [...s.otherPriorities, { ...emptyOtherPriority }],
    }));
  }
  function updateOtherPriority(index: number, update: Partial<OtherPriority>) {
    setState((s) => ({
      ...s,
      otherPriorities: s.otherPriorities.map((p, i) =>
        i === index ? { ...p, ...update } : p
      ),
    }));
  }
  function removeOtherPriority(index: number) {
    setState((s) => ({
      ...s,
      otherPriorities: s.otherPriorities.filter((_, i) => i !== index),
    }));
  }

  async function handleGenerate() {
    if (!canGenerate) {
      setError(generateBlockedReason);
      return;
    }
    setError("");
    setSaved(false);
    setGenerating(true);
    try {
      const endpoint = planId
        ? `/api/generate/iflp?planId=${encodeURIComponent(planId)}`
        : "/api/generate/iflp";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
      // The plan was persisted server-side before the document was built.
      setSaved(true);
      // Stream the returned docx to a download.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IFLP-${state.client1.lastName.trim() || "draft"}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // The plan is saved and the document has downloaded — send the user back
      // to the dashboard, where the new/updated report now appears. refresh()
      // re-runs the dashboard's server query so the list is current.
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <div ref={topRef} className="mx-auto w-full max-w-2xl scroll-mt-6">
        {/* Progress */}
        <ol className="mb-8 flex items-stretch gap-2">
          {IFLP_STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
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
                    active
                      ? "bg-accent"
                      : done
                        ? "bg-accent/50"
                        : "bg-foreground/15"
                  }`}
                />
              </li>
            );
          })}
        </ol>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Step {stepIndex + 1} of {IFLP_STEPS.length}
          </p>
          <h1 className="mt-1 text-2xl font-heading font-bold text-foreground">
            {step.title}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">{step.blurb}</p>
        </div>

        {/* Step body */}
        <div className="space-y-6">
          {step.id === "people" ? (
            <PeopleStep
              state={state}
              patch={patch}
              patchClient={patchClient}
              addChild={addChild}
              updateChild={updateChild}
              removeChild={removeChild}
              addOtherPriority={addOtherPriority}
              updateOtherPriority={updateOtherPriority}
              removeOtherPriority={removeOtherPriority}
            />
          ) : step.id === "goals" ? (
            <GoalsStep state={state} patch={patch} />
          ) : step.id === "retirement" ? (
            <RetirementStep
              state={state}
              patch={patch}
              patchClient={patchClient}
            />
          ) : step.id === "accounts" ? (
            <AccountsStep
              state={state}
              patch={patch}
              patchClient={patchClient}
              updateChild={updateChild}
            />
          ) : step.id === "insurance" ? (
            <InsuranceStep state={state} patchClient={patchClient} />
          ) : step.id === "implementation" ? (
            <ImplementationStep state={state} patch={patch} />
          ) : (
            <div className="rounded-lg border border-dashed border-foreground/20 bg-foreground/[0.02] px-4 py-10 text-center text-sm text-foreground/45">
              Fields for “{step.title}” are coming next. You can still generate
              the document to check what’s been filled so far.
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
            Plan saved. Your document has been downloaded.
          </p>
        )}

        {/* Nav + generate */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-foreground/10 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden />
              Back
            </button>
            {isDev && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setState(mockIflpFormState);
                  setError("");
                }}
                title="Dev only — fill every step with sample data"
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              >
                <FlaskConical size={14} aria-hidden />
                Fill mock data
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLast ? (
              // Final step only: one click persists the whole plan and streams
              // back the document.
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !canGenerate}
                title={canGenerate ? undefined : generateBlockedReason}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileDown size={16} aria-hidden />
                {generating
                  ? "Saving…"
                  : isEditing
                    ? "Update & generate document"
                    : "Save & generate document"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground hover:brightness-105"
              >
                Next
                <ArrowRight size={16} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function PeopleStep({
  state,
  patch,
  patchClient,
  addChild,
  updateChild,
  removeChild,
  addOtherPriority,
  updateOtherPriority,
  removeOtherPriority,
}: {
  state: IflpFormState;
  patch: (u: Partial<IflpFormState>) => void;
  patchClient: (k: "client1" | "client2", u: Partial<IflpClient>) => void;
  addChild: () => void;
  updateChild: (index: number, u: Partial<IflpChild>) => void;
  removeChild: (index: number) => void;
  addOtherPriority: () => void;
  updateOtherPriority: (index: number, u: Partial<OtherPriority>) => void;
  removeOtherPriority: (index: number) => void;
}) {
  return (
    <>
      <MonthYearPicker
        id="plan-date"
        label="Plan month & year"
        month={state.planMonth}
        year={state.planYear}
        onMonthChange={(planMonth) => patch({ planMonth })}
        onYearChange={(planYear) => patch({ planYear })}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Client 1</legend>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            id="c1-first"
            label="First name"
            required
            value={state.client1.firstName}
            onChange={(firstName) => patchClient("client1", { firstName })}
          />
          <TextInput
            id="c1-last"
            label="Last name"
            required
            value={state.client1.lastName}
            onChange={(lastName) => patchClient("client1", { lastName })}
          />
        </div>
        <NumberInput
          id="c1-age"
          label="Age"
          value={state.client1.age}
          onChange={(age) => patchClient("client1", { age })}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Client 2 <span className="font-normal text-foreground/50">(optional)</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            id="c2-first"
            label="First name"
            value={state.client2.firstName}
            onChange={(firstName) => patchClient("client2", { firstName })}
          />
          <TextInput
            id="c2-last"
            label="Last name"
            value={state.client2.lastName}
            onChange={(lastName) => patchClient("client2", { lastName })}
          />
        </div>
        <NumberInput
          id="c2-age"
          label="Age"
          value={state.client2.age}
          onChange={(age) => patchClient("client2", { age })}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Children <span className="font-normal text-foreground/50">(optional)</span>
        </legend>

        {state.children.length === 0 ? (
          <p className="text-sm text-foreground/50">No children added yet.</p>
        ) : (
          <div className="space-y-3">
            {state.children.map((child, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="grid flex-1 grid-cols-3 gap-3">
                  <TextInput
                    id={`child-${i}-first`}
                    label="First name"
                    value={child.firstName}
                    onChange={(firstName) => updateChild(i, { firstName })}
                  />
                  <TextInput
                    id={`child-${i}-last`}
                    label="Last name"
                    value={child.lastName}
                    onChange={(lastName) => updateChild(i, { lastName })}
                  />
                  <NumberInput
                    id={`child-${i}-age`}
                    label="Age"
                    value={child.age}
                    onChange={(age) => updateChild(i, { age })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeChild(i)}
                  aria-label={`Remove child ${i + 1}`}
                  className="mb-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                >
                  <Trash2 size={14} aria-hidden />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addChild}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
        >
          <Plus size={16} aria-hidden />
          Add child
        </button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Profile</legend>
        <TextInput
          id="corp-name"
          label="Corporation name"
          value={state.corporationName}
          onChange={(corporationName) => patch({ corporationName })}
        />
        <CurrencyInput
          id="household-income"
          label="Household income"
          value={state.householdIncome}
          onChange={(householdIncome) => patch({ householdIncome })}
        />
        <TagInput
          id="priorities"
          label="Priorities"
          options={priorityOptions}
          value={state.priorities}
          onChange={(priorities) => patch({ priorities })}
          placeholder="Select priorities…"
        />

        {/* The document's Priorities table is Priority | Desired Outcome, and
            its six standard rows are fixed copy in the template. A priority the
            list above doesn't cover therefore needs both halves to become a row
            of its own — the name alone has nothing to sit beside it. */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-foreground/70">
            Other priorities{" "}
            <span className="font-normal text-foreground/50">(optional)</span>
          </p>

          {state.otherPriorities.length === 0 ? (
            <p className="text-sm text-foreground/50">
              None added. Each one becomes an extra row in the plan’s
              “Your&nbsp;Priorities” table.
            </p>
          ) : (
            <div className="space-y-3">
              {state.otherPriorities.map((priority, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <TextInput
                      id={`other-priority-${i}-name`}
                      label="Priority"
                      value={priority.name}
                      onChange={(name) => updateOtherPriority(i, { name })}
                      placeholder="Charitable giving"
                    />
                    <TextInput
                      id={`other-priority-${i}-outcome`}
                      label="Desired outcome"
                      value={priority.outcome}
                      onChange={(outcome) => updateOtherPriority(i, { outcome })}
                      placeholder="Fund an annual gift without reducing retirement income"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOtherPriority(i)}
                    aria-label={`Remove priority ${i + 1}`}
                    className="mb-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Trash2 size={14} aria-hidden />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addOtherPriority}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
          >
            <Plus size={16} aria-hidden />
            Add priority
          </button>
        </div>
      </fieldset>
    </>
  );
}

function GoalsStep({
  state,
  patch,
}: {
  state: IflpFormState;
  patch: (u: Partial<IflpFormState>) => void;
}) {
  // "What success looks like" reads its four figures from later steps; the
  // Corporate Fixed Bucket supplies two of them.
  const ca = state.corporateAccounts;
  // Projected Access to Capital — fixed year rows (labels static; amounts only).
  const ac = state.accessToCapital;
  const setAC = (u: Partial<AccessToCapitalInput>) =>
    patch({ accessToCapital: { ...ac, ...u } });
  const accessCapitalRows: { field: keyof AccessToCapitalInput; label: string }[] = [
    { field: "year2", label: "Year 2" },
    { field: "year4", label: "Year 4" },
    { field: "year6", label: "Year 6" },
    { field: "year8", label: "Year 8" },
    { field: "year10", label: "Year 10" },
  ];

  return (
    <>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Financial independence
        </legend>
        <NumberInput
          id="target-independence-age"
          label="Target independence age"
          required
          value={state.targetIndependenceAge}
          onChange={(targetIndependenceAge) => patch({ targetIndependenceAge })}
        />
        <p className="text-xs text-foreground/50">
          Fills “Create financial independence by age …” and the Profile’s
          Retirement Goal.
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          What success looks like
        </legend>
        <p className="text-xs text-foreground/50">
          Every figure here is calculated from what you enter later in the plan —
          fill in steps 3 and 4 and these fill themselves.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <DerivedCurrency
            id="success-retirement-income"
            label="Retirement Income"
            value={retirementIncomeTotal(state)}
            hint={sourceHint("retirement", "Projected Annual Retirement Income total")}
          />
          <DerivedCurrency
            id="success-tax-free-income"
            label="Tax-Free Income"
            value={ca.fixedAnnualTaxFreeIncome}
            hint={sourceHint("accounts", "Corporate Fixed Bucket")}
          />
          <DerivedCurrency
            id="success-access-to-capital"
            label="Access to Capital"
            value={ac.year10}
            hint="Year 10, below"
          />
          <DerivedCurrency
            id="success-estate-value"
            label="Estate Value"
            value={ca.fixedEstateValue}
            hint={sourceHint("accounts", "Corporate Fixed Bucket")}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Projected Access to Capital
        </legend>
        <p className="text-xs text-foreground/50">
          Potential capital available at each milestone year. Blank rows render
          empty in the document.
        </p>
        {accessCapitalRows.map((row) => (
          <CurrencyInput
            key={row.field}
            id={`access-capital-${row.field}`}
            label={row.label}
            prefix="$"
            value={ac[row.field]}
            onChange={(v) => setAC({ [row.field]: v })}
          />
        ))}
      </fieldset>
    </>
  );
}

function RetirementStep({
  state,
  patch,
  patchClient,
}: {
  state: IflpFormState;
  patch: (u: Partial<IflpFormState>) => void;
  patchClient: (k: "client1" | "client2", u: Partial<IflpClient>) => void;
}) {
  // Per-client tables read off Step 1's clients — names aren't re-entered here,
  // only the amounts. Every total mirrors the document's auto-computed figure.
  const clients = deriveClients(state);
  const clientFor = (key: string) =>
    key === "client1" ? state.client1 : state.client2;

  const rb = state.retirementBuckets;
  const setRB = (u: Partial<RetirementBucketsInput>) =>
    patch({ retirementBuckets: { ...rb, ...u } });


  // Every total below is computed in iflp-derive.ts, the same module the document
  // payload reads, so what the planner sees here and what the plan prints cannot
  // diverge.
  const bucketMonthly = bucketMonthlyTotal(state);
  const bucketAnnual = bucketAnnualTotal(state);
  const savingsTotal = monthlySavingsTotal(state);
  const cppOasTotal = governmentBenefitsTotal(state);

  // Projected Annual Retirement Income — fixed source rows. Client 2 rows only
  // show when a second client exists (they drop from the document too).
  const ri = state.retirementIncome;
  const setRI = (
    key: keyof RetirementIncomeInput,
    u: Partial<RetirementIncomeSource>
  ) => patch({ retirementIncome: { ...ri, [key]: { ...ri[key], ...u } } });
  const c1Name = clients[0]?.name || "Client 1";
  const c2Name = clients[1]?.name || "Client 2";
  const hasClient2 = clients.length > 1;
  const incomeRowDefs: {
    key: keyof RetirementIncomeInput;
    label: string;
    client2?: boolean;
    // Set when the row's annual income is entered elsewhere in the plan.
    income?: (s: IflpFormState) => number | null;
    incomeHint?: string;
  }[] = [
    { key: "cppOas1", label: `CPP & OAS (${c1Name})` },
    { key: "cppOas2", label: `CPP & OAS (${c2Name})`, client2: true },
    { key: "tfsa1", label: `TFSA (${c1Name})` },
    { key: "tfsa2", label: `TFSA (${c2Name})`, client2: true },
    { key: "personalPension", label: "Personal Pension Plan" },
    {
      key: "corporateLiquid",
      label: "Corporate Liquid Bucket",
      // Entered in Accounts & Education instead (comment 8); shown here read-only
      // so the summary still reads as a complete table.
      income: corporateLiquidIncome,
      incomeHint: sourceHint("accounts", "Corporate Liquid Bucket"),
    },
    { key: "corporateFixed", label: "Corporate Fixed Bucket (Tax-Free)" },
  ];
  // Every row but Corporate Liquid carries its own annual income; that one is
  // read from the account section, so the union needs narrowing to read it.
  const incomeOf = (src: RetirementIncomeInput[keyof RetirementIncomeInput]) =>
    "annualIncome" in src ? src.annualIncome : null;
  const incomeRows = incomeRowDefs.filter((r) => hasClient2 || !r.client2);
  const incomeTotal = retirementIncomeTotal(state);

  // `delivers` names where a bucket's annual figure comes from. A bucket without
  // one has no source field yet and keeps its typed input: Personal Savings waits
  // on the per-account retirement income (comments 6/10), Corporate Liquid on its
  // "Annual Income in Retirement" field (comment 8).
  const buckets: {
    key: string;
    label: string;
    monthly: keyof RetirementBucketsInput;
    // Only set when the bucket still types its own annual figure; a bucket with
    // `delivers` has no stored field to point at.
    annual?: keyof RetirementBucketsInput;
    delivers?: (s: IflpFormState) => number | null;
    deliversHint?: string;
  }[] = [
    { key: "personal", label: "Personal Savings Bucket", monthly: "personalMonthly", annual: "personalAnnual" },
    {
      key: "corpLiquid",
      label: "Corporate Liquid Bucket",
      monthly: "corpLiquidMonthly",
      delivers: corporateLiquidIncome,
      deliversHint: sourceHint("accounts", "Corporate Liquid annual income in retirement"),
    },
    {
      key: "corpFixed",
      label: "Corporate Fixed Bucket",
      monthly: "corpFixedMonthly",
      delivers: corporateFixedDelivers,
      deliversHint: sourceHint("accounts", "Corporate Fixed annual tax-free income"),
    },
  ];

  return (
    <div className="space-y-8">
      <CollapsibleSection
        title="Retirement Buckets"
        hint="Monthly contribution and what each bucket delivers per year."
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/70">
            Government Bucket{" "}
            <span className="font-normal text-foreground/40">
              (no contribution)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <DerivedCurrency
              label="Monthly contribution"
              value={null}
              emptyText="N/A"
            />
            <DerivedCurrency
              id="bucket-gov-annual"
              label="Delivers / year"
              value={governmentDelivers(state)}
              hint="Government Retirement Benefits total, below"
            />
          </div>
        </div>

        {buckets.map((b) => (
          <div key={b.key} className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">{b.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput
                id={`bucket-${b.key}-monthly`}
                label="Monthly contribution"
                prefix="$"
                value={rb[b.monthly]}
                onChange={(v) =>
                  setRB({ [b.monthly]: v } as Partial<RetirementBucketsInput>)
                }
                placeholder="500"
              />
              {b.delivers ? (
                <DerivedCurrency
                  id={`bucket-${b.key}-annual`}
                  label="Delivers / year"
                  value={b.delivers(state)}
                  hint={b.deliversHint}
                />
              ) : (
                <CurrencyInput
                  id={`bucket-${b.key}-annual`}
                  label="Delivers / year"
                  prefix="$"
                  value={b.annual ? rb[b.annual] : null}
                  onChange={(v) =>
                    setRB({ [b.annual as string]: v } as Partial<RetirementBucketsInput>)
                  }
                  placeholder="60,000"
                />
              )}
            </div>
          </div>
        ))}

        <p className="text-xs text-foreground/60">
          Total — monthly{" "}
          <span className="font-semibold text-foreground">
            {moneyOrDash(bucketMonthly)}
          </span>
          , delivering{" "}
          <span className="font-semibold text-foreground">
            {bucketAnnual == null ? "—" : `${moneyOrDash(bucketAnnual)}/year`}
          </span>
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Income Alignment">
        {clients.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Add a client in Step 1 to align income.
          </p>
        ) : (
          clients.map((p) => {
            const key = p.key as "client1" | "client2";
            const c = clientFor(key);
            // Salary and dividends are alternatives, not a split: picking one
            // decides which half of the document's Income Alignment section this
            // client fills, so there is a single amount field and its label
            // follows the choice.
            const isDividend = c.incomeStructure === "dividend";
            return (
              <div key={key} className="space-y-2">
                <p className="text-xs font-medium text-foreground/70">{p.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <SelectInput
                    id={`${key}-income-structure`}
                    label="Income structure"
                    options={incomeStructureOptions}
                    value={c.incomeStructure}
                    onChange={(v) =>
                      patchClient(key, { incomeStructure: v as IncomeStructure })
                    }
                  />
                  <CurrencyInput
                    id={`${key}-income-amount`}
                    label={isDividend ? "Dividends" : "Salary"}
                    prefix="$"
                    value={c.incomeAlignmentAmount}
                    onChange={(incomeAlignmentAmount) =>
                      patchClient(key, { incomeAlignmentAmount })
                    }
                    placeholder="150,000"
                  />
                </div>
              </div>
            );
          })
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Monthly Savings Allocation">
        <DerivedCurrency
          id="ms-personal"
          label="Personal Savings"
          value={personalSavingsMonthly(state)}
          hint={sourceHint("accounts", "TFSA + RRSP + FHSA + Non-Registered")}
        />
        <DerivedCurrency
          id="ms-corp-liquid"
          label="Corporate Liquid Bucket"
          value={monthlySavingsCorpLiquid(state)}
          hint={sourceHint("accounts", "Corporate Liquid monthly contribution")}
        />
        <DerivedCurrency
          id="ms-corp-fixed"
          label="Corporate Fixed Bucket"
          value={monthlySavingsCorpFixed(state)}
          hint={sourceHint("accounts", "Corporate Fixed monthly contribution, both clients")}
        />
        <p className="text-xs text-foreground/60">
          Total monthly savings:{" "}
          <span className="font-semibold text-foreground">
            {moneyOrDash(savingsTotal)}
          </span>
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Government Retirement Benefits (CPP & OAS)">
        {clients.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Add a client in Step 1 to enter their CPP and OAS.
          </p>
        ) : (
          <>
            {clients.map((p) => {
              const key = p.key as "client1" | "client2";
              const c = clientFor(key);
              return (
                <div key={key} className="space-y-2">
                  <p className="text-xs font-medium text-foreground/70">
                    {p.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput
                      id={`${key}-cpp`}
                      label="CPP"
                      prefix="$"
                      value={c.cppAmount}
                      onChange={(cppAmount) => patchClient(key, { cppAmount })}
                      placeholder="15,000"
                    />
                    <CurrencyInput
                      id={`${key}-oas`}
                      label="OAS"
                      prefix="$"
                      value={c.oasAmount}
                      onChange={(oasAmount) => patchClient(key, { oasAmount })}
                      placeholder="8,000"
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-foreground/60">
              Total projected government retirement income:{" "}
              <span className="font-semibold text-foreground">
                {moneyOrDash(cppOasTotal)}
              </span>
            </p>
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Projected Annual Retirement Income"
        hint="Annual income and expected estate value from each source. Total income is computed."
      >
        {incomeRows.map((row) => (
          <div key={row.key} className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">{row.label}</p>
            <div className="grid grid-cols-2 gap-3">
              {row.income ? (
                <DerivedCurrency
                  id={`ri-${row.key}-income`}
                  label="Annual Income"
                  value={row.income(state)}
                  hint={row.incomeHint}
                />
              ) : (
                <CurrencyInput
                  id={`ri-${row.key}-income`}
                  label="Annual Income"
                  prefix="$"
                  value={incomeOf(ri[row.key])}
                  onChange={(annualIncome) => setRI(row.key, { annualIncome })}
                />
              )}
              <CurrencyInput
                id={`ri-${row.key}-estate`}
                label="Expected Estate Value"
                prefix="$"
                value={ri[row.key].estateValue}
                onChange={(estateValue) => setRI(row.key, { estateValue })}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-foreground/60">
          Total projected annual retirement income:{" "}
          <span className="font-semibold text-foreground">
            {moneyOrDash(incomeTotal)}
          </span>
        </p>
      </CollapsibleSection>
    </div>
  );
}

function AccountsStep({
  state,
  patch,
  updateChild,
}: {
  state: IflpFormState;
  patch: (u: Partial<IflpFormState>) => void;
  patchClient: (k: "client1" | "client2", u: Partial<IflpClient>) => void;
  updateChild: (index: number, u: Partial<IflpChild>) => void;
}) {
  const ca = state.corporateAccounts;
  const setCA = (u: Partial<CorporateAccountsInput>) =>
    patch({ corporateAccounts: { ...ca, ...u } });

  const accounts = state.accounts;
  const setAccount = (index: number, u: Partial<AccountRow>) =>
    patch({
      accounts: accounts.map((a, i) => (i === index ? { ...a, ...u } : a)),
    });
  const removeAccount = (index: number) =>
    patch({ accounts: accounts.filter((_, i) => i !== index) });

  // A new account defaults its party when there is only one candidate, so the
  // common single-client / single-corporation case needs no extra click.
  const addAccount = (kind: AccountKind) => {
    const def = ACCOUNT_KINDS[kind];
    const candidates = partyOptions(state, def.holder === "client");
    const only = candidates.filter((o) =>
      def.holder === "corporation" ? o.value === "corporation" : o.value !== "corporation"
    );
    patch({
      accounts: [
        ...accounts,
        { ...emptyAccountRow, kind, party: only.length === 1 ? only[0].value : "" },
      ],
    });
  };

  const namedChildren = state.children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => child.firstName.trim());
  const educationCostTotal = educationTotal(state);

  const personalRows = accounts
    .map((a, index) => ({ a, index }))
    .filter(({ a }) => ACCOUNT_KINDS[a.kind].personalSavings);

  return (
    <div className="space-y-8">
      {(Object.keys(ACCOUNT_KINDS) as AccountKind[]).map((kind) => {
        const def = ACCOUNT_KINDS[kind];
        const rows = accounts
          .map((a, index) => ({ a, index }))
          .filter(({ a }) => a.kind === kind);
        const parties = partyOptions(state, def.holder === "client").filter((o) =>
          def.holder === "corporation"
            ? o.value === "corporation"
            : o.value !== "corporation"
        );
        return (
          <CollapsibleSection
            key={kind}
            title={def.label}
            defaultOpen={rows.length > 0}
            hint={
              rows.length === 0
                ? "Not in this plan. Add one to include its page in the document."
                : undefined
            }
          >
            {rows.map(({ a, index }) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border border-foreground/10 bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-foreground/70">
                    {a.party
                      ? partyName(state, a.party as PartyKey)
                      : def.holder === "corporation"
                        ? "Select an entity"
                        : "Select a client"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAccount(index)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Trash2 size={13} aria-hidden />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectInput
                    id={`account-${index}-party`}
                    label={def.holder === "corporation" ? "Entity" : "Client"}
                    placeholder="Select…"
                    options={parties}
                    value={a.party}
                    onChange={(party) => setAccount(index, { party })}
                  />
                  <div />
                  <CurrencyInput
                    id={`account-${index}-monthly`}
                    label="Monthly Contribution"
                    prefix="$"
                    value={a.monthlyContribution}
                    onChange={(monthlyContribution) =>
                      setAccount(index, { monthlyContribution })
                    }
                  />
                  <DerivedCurrency
                    id={`account-${index}-annual`}
                    label="Annual Contribution"
                    value={annualFromMonthly(a.monthlyContribution)}
                    hint="12 × monthly"
                  />
                  {def.hasEstimatedValue && (
                    <CurrencyInput
                      id={`account-${index}-value`}
                      label={def.estimatedValueLabel ?? "Estimated Value"}
                      prefix="$"
                      value={a.estimatedValue}
                      onChange={(estimatedValue) =>
                        setAccount(index, { estimatedValue })
                      }
                    />
                  )}
                  {def.hasRetirementIncome && (
                    <CurrencyInput
                      id={`account-${index}-income`}
                      label="Annual Income in Retirement"
                      prefix="$"
                      value={a.retirementIncome}
                      onChange={(retirementIncome) =>
                        setAccount(index, { retirementIncome })
                      }
                      placeholder="60,000"
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addAccount(kind)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
            >
              <Plus size={16} aria-hidden />
              Add {def.label}
            </button>
          </CollapsibleSection>
        );
      })}

      {personalRows.length > 0 && (
        <CollapsibleSection
          title="Personal Savings Summary"
          hint="Every personal account added above, and what they total."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/15 text-left text-xs font-medium uppercase tracking-wide text-foreground/50">
                  <th className="pb-2 pr-3 font-medium">Account</th>
                  <th className="pb-2 pr-3 text-right font-medium">Monthly</th>
                  <th className="pb-2 text-right font-medium">Annual</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {personalRows.map(({ a, index }) => (
                  <tr key={index} className="border-b border-foreground/[0.07]">
                    <td className="py-2 pr-3">
                      {ACCOUNT_KINDS[a.kind].label}
                      {a.party && (
                        <span className="text-foreground/45">
                          {" · "}
                          {partyName(state, a.party as PartyKey)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {moneyOrDash(a.monthlyContribution)}
                    </td>
                    <td className="py-2 text-right">
                      {moneyOrDash(annualFromMonthly(a.monthlyContribution))}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3">Total Personal Savings</td>
                  <td className="py-2 pr-3 text-right">
                    {moneyOrDash(personalSavingsMonthly(state))}
                  </td>
                  <td className="py-2 text-right">
                    {moneyOrDash(annualFromMonthly(personalSavingsMonthly(state)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Corporate Fixed Bucket — What It Delivers"
        hint="Plan-level figures, not tied to one contribution."
      >
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput
            id="corp-fixed-tfi"
            label="Annual Tax-Free Income"
            prefix="$"
            value={ca.fixedAnnualTaxFreeIncome}
            onChange={(v) => setCA({ fixedAnnualTaxFreeIncome: v })}
          />
          <NumberInput
            id="corp-fixed-period"
            label="Contribution Period"
            suffix="years"
            value={ca.fixedContributionPeriodYears}
            onChange={(v) => setCA({ fixedContributionPeriodYears: v })}
          />
          <CurrencyInput
            id="corp-fixed-estate"
            label="Estate Value"
            prefix="$"
            value={ca.fixedEstateValue}
            onChange={(v) => setCA({ fixedEstateValue: v })}
          />
          <CurrencyInput
            id="corp-fixed-lifetime"
            label="Total Lifetime Value"
            prefix="$"
            value={ca.fixedTotalLifetimeValue}
            onChange={(v) => setCA({ fixedTotalLifetimeValue: v })}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Education Funding">
        {namedChildren.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Add a child in Step 1 to plan education funding.
          </p>
        ) : (
          <>
            {namedChildren.map(({ child, index }) => (
              <div key={index} className="space-y-2">
                <p className="text-xs font-medium text-foreground/70">
                  {child.firstName.trim()}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput
                    id={`edu-${index}-cost`}
                    label="Funding Goal"
                    prefix="$"
                    value={child.educationCost}
                    onChange={(educationCost) =>
                      updateChild(index, { educationCost })
                    }
                  />
                  <NumberInput
                    id={`edu-${index}-years`}
                    label="Years Until Needed"
                    suffix="years"
                    value={child.educationYearsAway}
                    onChange={(educationYearsAway) =>
                      updateChild(index, { educationYearsAway })
                    }
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-foreground/60">
              Total funding goal:{" "}
              <span className="font-semibold text-foreground">
                {moneyOrDash(educationCostTotal)}
              </span>
            </p>
          </>
        )}
      </CollapsibleSection>
    </div>
  );
}

// Numeric per-client insurance amount fields.
type ClientInsuranceAmount =
  | "termLifeCoverage"
  | "criticalIllnessCoverage"
  | "disabilityMonthlyBenefit";
// Matching modifier (string) fields.
type ClientInsuranceModifier =
  | "termLifeTerm"
  | "criticalIllnessProduct"
  | "disabilityBenefitTerm";

function InsuranceStep({
  state,
  patchClient,
}: {
  state: IflpFormState;
  patchClient: (k: "client1" | "client2", u: Partial<IflpClient>) => void;
}) {
  const clients = deriveClients(state);
  const clientFor = (key: string) =>
    key === "client1" ? state.client1 : state.client2;

  // One row per client: an amount plus a modifier chosen from `options`.
  const coverage = (
    idPrefix: string,
    amountLabel: string,
    amountField: ClientInsuranceAmount,
    modifierLabel: string,
    modifierField: ClientInsuranceModifier,
    options: { label: string; value: string }[]
  ) =>
    clients.length === 0 ? (
      <p className="text-sm text-foreground/50">
        Add a client in Step 1 to enter coverage.
      </p>
    ) : (
      clients.map((p) => {
        const key = p.key as "client1" | "client2";
        const c = clientFor(key);
        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">{p.name}</p>
            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput
                id={`${idPrefix}-${key}-amount`}
                label={amountLabel}
                prefix="$"
                value={c[amountField]}
                onChange={(v) => patchClient(key, { [amountField]: v })}
              />
              <SelectInput
                id={`${idPrefix}-${key}-modifier`}
                label={modifierLabel}
                options={options}
                value={c[modifierField]}
                onChange={(v) => patchClient(key, { [modifierField]: v })}
              />
            </div>
          </div>
        );
      })
    );

  return (
    <div className="space-y-8">
      <CollapsibleSection title="Term Life Insurance">
        {coverage("termlife", "Coverage Amount", "termLifeCoverage", "Term Length", "termLifeTerm", termLengthOptions)}
      </CollapsibleSection>

      <CollapsibleSection title="Critical Illness Insurance">
        {coverage("ci", "Coverage Amount", "criticalIllnessCoverage", "Product", "criticalIllnessProduct", criticalIllnessProductOptions)}
      </CollapsibleSection>

      <CollapsibleSection title="Disability Insurance">
        {coverage("di", "Monthly Benefit", "disabilityMonthlyBenefit", "Benefit Term", "disabilityBenefitTerm", benefitTermOptions)}
      </CollapsibleSection>
    </div>
  );
}

function AddRemoveRow({
  index,
  onRemove,
  children,
}: {
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-foreground/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/50">
          Row {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
        >
          <Trash2 size={13} aria-hidden />
          Remove
        </button>
      </div>
      {children}
    </div>
  );
}

function AddRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
    >
      <Plus size={16} aria-hidden />
      Add row
    </button>
  );
}

function TransferTable({
  title,
  rows,
  parties,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  rows: TransferRow[];
  parties: { label: string; value: string }[];
  onAdd: () => void;
  onUpdate: (index: number, u: Partial<TransferRow>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <CollapsibleSection title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground/50">No transfers added yet.</p>
      ) : (
        rows.map((row, i) => (
          <AddRemoveRow key={i} index={i} onRemove={() => onRemove(i)}>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput
                id={`${title}-${i}-party`}
                label="Client / entity"
                placeholder="Select…"
                options={parties}
                value={row.party}
                onChange={(v) => onUpdate(i, { party: v })}
              />
              <TextInput
                id={`${title}-${i}-institution`}
                label="Institution"
                value={row.institution}
                onChange={(v) => onUpdate(i, { institution: v })}
                placeholder="CIBC"
              />
              <SelectInput
                id={`${title}-${i}-account`}
                label="Account"
                placeholder="Select…"
                options={transferAccountOptions}
                value={row.account}
                onChange={(v) => onUpdate(i, { account: v })}
              />
              <SelectInput
                id={`${title}-${i}-method`}
                label="In-Kind / In-Cash"
                placeholder="Select…"
                options={transferMethodOptions}
                value={row.method}
                onChange={(v) => onUpdate(i, { method: v })}
              />
              <TextInput
                id={`${title}-${i}-time`}
                label="Expected time to receive"
                value={row.expectedTime}
                onChange={(v) => onUpdate(i, { expectedTime: v })}
                placeholder="2-4 weeks"
              />
            </div>
          </AddRemoveRow>
        ))
      )}
      <AddRowButton onClick={onAdd} />
    </CollapsibleSection>
  );
}

function FundingTable({
  title,
  amountLabel,
  rows,
  parties,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  amountLabel: string;
  rows: FundingRow[];
  parties: { label: string; value: string }[];
  onAdd: () => void;
  onUpdate: (index: number, u: Partial<FundingRow>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <CollapsibleSection title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground/50">No entries added yet.</p>
      ) : (
        rows.map((row, i) => (
          <AddRemoveRow key={i} index={i} onRemove={() => onRemove(i)}>
            <div className="grid grid-cols-3 gap-3">
              <SelectInput
                id={`${title}-${i}-party`}
                label="Client / entity"
                placeholder="Select…"
                options={parties}
                value={row.party}
                onChange={(v) => onUpdate(i, { party: v })}
              />
              <CurrencyInput
                id={`${title}-${i}-amount`}
                label={amountLabel}
                prefix="$"
                value={row.amount}
                onChange={(v) => onUpdate(i, { amount: v })}
              />
              <SelectInput
                id={`${title}-${i}-bucket`}
                label="Funding Bucket"
                placeholder="Select…"
                options={fundingBucketOptions}
                value={row.bucket}
                onChange={(v) => onUpdate(i, { bucket: v })}
              />
            </div>
          </AddRemoveRow>
        ))
      )}
      <AddRowButton onClick={onAdd} />
    </CollapsibleSection>
  );
}

type TransferField = "transfersPersonal" | "transfersCorporate";
type FundingField =
  | "fundingPersonal"
  | "fundingCorporate"
  | "monthlyPersonal"
  | "monthlyCorporate";

function ImplementationStep({
  state,
  patch,
}: {
  state: IflpFormState;
  patch: (u: Partial<IflpFormState>) => void;
}) {
  const parties = partyOptions(state);

  const transferHandlers = (field: TransferField) => ({
    rows: state[field],
    onAdd: () => patch({ [field]: [...state[field], { ...emptyTransferRow }] }),
    onUpdate: (i: number, u: Partial<TransferRow>) =>
      patch({
        [field]: state[field].map((r, idx) => (idx === i ? { ...r, ...u } : r)),
      }),
    onRemove: (i: number) =>
      patch({ [field]: state[field].filter((_, idx) => idx !== i) }),
  });
  const fundingHandlers = (field: FundingField) => ({
    rows: state[field],
    onAdd: () => patch({ [field]: [...state[field], { ...emptyFundingRow }] }),
    onUpdate: (i: number, u: Partial<FundingRow>) =>
      patch({
        [field]: state[field].map((r, idx) => (idx === i ? { ...r, ...u } : r)),
      }),
    onRemove: (i: number) =>
      patch({ [field]: state[field].filter((_, idx) => idx !== i) }),
  });

  return (
    <div className="space-y-8">
      <TransferTable title="Account Transfers — Personal" parties={parties} {...transferHandlers("transfersPersonal")} />
      <TransferTable title="Account Transfers — Corporation" parties={parties} {...transferHandlers("transfersCorporate")} />
      <FundingTable title="Initial Funding — Lump Sum (Personal)" amountLabel="Amount" parties={parties} {...fundingHandlers("fundingPersonal")} />
      <FundingTable title="Initial Funding — Lump Sum (Corporation)" amountLabel="Amount" parties={parties} {...fundingHandlers("fundingCorporate")} />
      <FundingTable title="Monthly Contributions — Personal" amountLabel="Contribution Amount" parties={parties} {...fundingHandlers("monthlyPersonal")} />
      <FundingTable title="Monthly Contributions — Corporation" amountLabel="Contribution Amount" parties={parties} {...fundingHandlers("monthlyCorporate")} />
    </div>
  );
}
