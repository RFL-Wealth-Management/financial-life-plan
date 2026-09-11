import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ToggleInput } from "./ToggleInput";

const meta: Meta<typeof ToggleInput> = {
  title: "Fields/ToggleInput",
  component: ToggleInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToggleInput>;

function Controlled(props: Partial<React.ComponentProps<typeof ToggleInput>>) {
  const [value, setValue] = useState(props.value ?? true);
  return (
    <div>
      <ToggleInput
        id="demo"
        label="Include in plan"
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
        Raw value: {String(value)}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

export const Off: Story = {
  render: () => <Controlled value={false} />,
  name: "Set to No",
};

export const WithHint: Story = {
  render: () => (
    <Controlled label="TFSA" hint="No removes the TFSA page from the final IFLP." />
  ),
  name: "With hint",
};

// How the account toggles read in the Accounts step: one per account, stacked.
function AccountList() {
  const [included, setIncluded] = useState<Record<string, boolean>>({
    TFSA: true,
    RRSP: false,
    FHSA: true,
    "Non-Registered": false,
  });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {Object.entries(included).map(([name, value]) => (
        <ToggleInput
          key={name}
          id={`acct-${name}`}
          label={name}
          value={value}
          onChange={(v) => setIncluded((prev) => ({ ...prev, [name]: v }))}
        />
      ))}
    </div>
  );
}

export const AccountInclusion: Story = {
  render: () => <AccountList />,
  name: "Account inclusion list",
};
