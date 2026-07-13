import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SelectInput } from "./SelectInput";

const meta: Meta<typeof SelectInput> = {
  title: "Fields/SelectInput",
  component: SelectInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SelectInput>;

const insuranceOptions = [
  { label: "Living Benefit 75", value: "living-benefit-75" },
  { label: "Living Benefit 100", value: "living-benefit-100" },
  { label: "Term 10", value: "term-10" },
  { label: "Term 20", value: "term-20" },
];

const termOptions = [
  { label: "To Age 65", value: "to-age-65" },
  { label: "To Age 60", value: "to-age-60" },
  { label: "2 Year Benefit", value: "2-year" },
  { label: "5 Year Benefit", value: "5-year" },
];

function Controlled(props: Partial<React.ComponentProps<typeof SelectInput>>) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <div>
      <SelectInput
        id="demo"
        label="Insurance Product"
        options={insuranceOptions}
        value={value}
        onChange={setValue}
        {...props}
      />
      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "#888",
          fontFamily: "monospace",
        }}
      >
        Selected: {value || "(none)"}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <Controlled placeholder="Select a product..." />,
};

export const Required: Story = {
  render: () => (
    <Controlled required placeholder="Select a product..." />
  ),
};

export const DisabilityTerm: Story = {
  render: () => (
    <Controlled
      label="Disability Benefit Term"
      options={termOptions}
      placeholder="Select term..."
    />
  ),
};

export const Preselected: Story = {
  render: () => <Controlled value="living-benefit-75" />,
  name: "Preselected (Living Benefit 75)",
};
