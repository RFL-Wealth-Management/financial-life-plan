import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CurrencyInput } from "./CurrencyInput";
import { DerivedCurrency } from "./DerivedCurrency";

const meta: Meta<typeof DerivedCurrency> = {
  title: "Fields/DerivedCurrency",
  component: DerivedCurrency,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DerivedCurrency>;

export const Default: Story = {
  render: () => (
    <DerivedCurrency label="Annual Contribution" value={6996} hint="12 × monthly" />
  ),
};

export const Empty: Story = {
  render: () => <DerivedCurrency label="Annual Contribution" value={null} />,
  name: "Empty (no monthly entered)",
};

export const NotApplicable: Story = {
  render: () => (
    <DerivedCurrency
      label="Monthly contribution"
      value={null}
      emptyText="N/A"
    />
  ),
  name: "Not applicable (Government bucket)",
};

// The pairing as it appears in the Accounts step: the planner types a monthly
// amount and the annual figure beside it follows.
function Pair() {
  const [monthly, setMonthly] = useState<number | null>(583);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <CurrencyInput
        id="demo-monthly"
        label="Monthly Contribution"
        prefix="$"
        value={monthly}
        onChange={setMonthly}
      />
      <DerivedCurrency
        id="demo-annual"
        label="Annual Contribution"
        value={monthly == null ? null : monthly * 12}
        hint="12 × monthly"
      />
    </div>
  );
}

export const LinkedToMonthly: Story = {
  render: () => <Pair />,
  name: "Linked to a monthly input",
};
