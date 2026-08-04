import type { Meta, StoryObj } from "@storybook/react";
import { CollapsibleSection } from "./CollapsibleSection";
import { CurrencyInput } from "./CurrencyInput";

const meta: Meta<typeof CollapsibleSection> = {
  title: "Fields/CollapsibleSection",
  component: CollapsibleSection,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CollapsibleSection>;

export const Single: Story = {
  render: () => (
    <CollapsibleSection
      title="Retirement Buckets"
      hint="Monthly contribution and what each bucket delivers per year."
    >
      <CurrencyInput
        id="demo-a"
        label="Personal Savings"
        prefix="$"
        value={2000}
        onChange={() => {}}
      />
      <CurrencyInput
        id="demo-b"
        label="Corporate Liquid Bucket"
        prefix="$"
        value={1500}
        onChange={() => {}}
      />
    </CollapsibleSection>
  ),
};

// Mirrors the Step-3 layout: several sections stacked with space-y-8, one
// collapsed to show the toggle state.
export const Stacked: Story = {
  render: () => (
    <div className="space-y-8">
      <CollapsibleSection title="Retirement Buckets" hint="Contributions and yearly delivery.">
        <CurrencyInput id="s-a" label="Personal Savings" prefix="$" value={2000} onChange={() => {}} />
      </CollapsibleSection>
      <CollapsibleSection title="Income Alignment">
        <CurrencyInput id="s-b" label="Salary" prefix="$" value={150000} onChange={() => {}} />
      </CollapsibleSection>
      <CollapsibleSection title="Monthly Savings Allocation" defaultOpen={false}>
        <CurrencyInput id="s-c" label="Personal Savings" prefix="$" value={2000} onChange={() => {}} />
      </CollapsibleSection>
      <CollapsibleSection title="Government Retirement Benefits (CPP & OAS)" defaultOpen={false}>
        <CurrencyInput id="s-d" label="CPP" prefix="$" value={15000} onChange={() => {}} />
      </CollapsibleSection>
    </div>
  ),
};
