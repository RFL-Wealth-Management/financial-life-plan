import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TagInput } from "./TagInput";

const meta: Meta<typeof TagInput> = {
  title: "Fields/TagInput",
  component: TagInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TagInput>;

// The IFLP "Your Priorities" list, as it appears in the template placeholder:
// "Retirement, Tax Efficiency, Education, Protection"
const priorityOptions = [
  { label: "Retirement", value: "retirement" },
  { label: "Tax Efficiency", value: "tax-efficiency" },
  { label: "Education", value: "education" },
  { label: "Protection", value: "protection" },
  { label: "Estate Planning", value: "estate-planning" },
  { label: "Debt Management", value: "debt-management" },
];

// `props.value` seeds the state; it must not also be spread onto TagInput, or a
// story with a preselected value pins the field to that value and nothing the
// story does appears to take effect.
function Controlled({
  value: initialValue,
  ...props
}: Partial<React.ComponentProps<typeof TagInput>>) {
  const [value, setValue] = useState<string[]>(initialValue ?? []);
  return (
    <div>
      <TagInput
        id="demo"
        label="Priorities"
        options={priorityOptions}
        placeholder="Select priorities..."
        {...props}
        value={value}
        onChange={setValue}
      />
      <p
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "#888",
          fontFamily: "monospace",
        }}
      >
        Renders as:{" "}
        {value.length
          ? value
              .map((v) => priorityOptions.find((o) => o.value === v)?.label ?? v)
              .join(", ")
          : "(none)"}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

export const Required: Story = {
  render: () => <Controlled required />,
};

export const Preselected: Story = {
  render: () => (
    <Controlled value={["retirement", "tax-efficiency", "education", "protection"]} />
  ),
  name: "Preselected (template default)",
};
