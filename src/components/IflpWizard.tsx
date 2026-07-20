"use client";

import { useState } from "react";
import {
  TextInput,
  NumberInput,
  CurrencyInput,
  MonthYearPicker,
  TagInput,
} from "@/components/fields";
import { priorityOptions } from "@/lib/field-options";
import {
  IFLP_STEPS,
  initialIflpFormState,
  type IflpClient,
  type IflpFormState,
} from "@/lib/iflp-form";

export function IflpWizard() {
  const [state, setState] = useState<IflpFormState>(initialIflpFormState);
  const [stepIndex, setStepIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const step = IFLP_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === IFLP_STEPS.length - 1;

  function patch(update: Partial<IflpFormState>) {
    setState((s) => ({ ...s, ...update }));
  }
  function patchClient(key: "client1" | "client2", update: Partial<IflpClient>) {
    setState((s) => ({ ...s, [key]: { ...s[key], ...update } }));
  }

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate/iflp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Progress */}
        <ol className="mb-8 flex items-center gap-2">
          {IFLP_STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    active
                      ? "bg-accent"
                      : done
                        ? "bg-accent/50"
                        : "bg-foreground/15"
                  }`}
                />
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
            />
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

        {/* Nav + generate */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-foreground/10 pt-5">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg border border-accent/40 px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent/10 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate document"}
            </button>
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(IFLP_STEPS.length - 1, i + 1))}
              disabled={isLast}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
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
}: {
  state: IflpFormState;
  patch: (u: Partial<IflpFormState>) => void;
  patchClient: (k: "client1" | "client2", u: Partial<IflpClient>) => void;
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
      </fieldset>
    </>
  );
}
