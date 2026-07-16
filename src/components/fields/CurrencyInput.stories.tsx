import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CurrencyInput } from "./CurrencyInput";

const meta: Meta<typeof CurrencyInput> = {
  title: "Fields/CurrencyInput",
  component: CurrencyInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CurrencyInput>;

function Controlled(
  props: Partial<React.ComponentProps<typeof CurrencyInput>>
) {
  const [value, setValue] = useState<number | null>(props.value ?? null);
  return (
    <div>
      <CurrencyInput
        id="demo"
        label="CPP Amount"
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
        Raw value: {value === null ? "null" : value}
      </p>
    </div>
  );
}

export const Empty: Story = {
  render: () => <Controlled />,
  name: "Empty (type, then blur to see formatting)",
};

export const Prefilled: Story = {
  render: () => <Controlled value={85000} label="Annual Income" />,
  name: "Prefilled ($85,000)",
};

export const Required: Story = {
  render: () => <Controlled required label="RRSP Contribution" />,
};

export const LargeValue: Story = {
  render: () => <Controlled value={1500000} label="Net Worth Target" />,
  name: "Large value ($1,500,000)",
};
