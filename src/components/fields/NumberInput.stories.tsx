import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NumberInput } from "./NumberInput";

const meta: Meta<typeof NumberInput> = {
  title: "Fields/NumberInput",
  component: NumberInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NumberInput>;

function Controlled(props: Partial<React.ComponentProps<typeof NumberInput>>) {
  const [value, setValue] = useState<number | null>(props.value ?? null);
  return (
    <div>
      <NumberInput
        id="demo"
        label="Age"
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

export const Default: Story = {
  render: () => <Controlled />,
};

export const WithSuffix: Story = {
  render: () => <Controlled label="Years to Retirement" suffix="years" />,
  name: "With suffix (years)",
};

export const WithMinMax: Story = {
  render: () => <Controlled label="Age" min={18} max={100} />,
  name: "With min/max (18-100)",
};

export const Prefilled: Story = {
  render: () => <Controlled value={45} label="Age" />,
};
