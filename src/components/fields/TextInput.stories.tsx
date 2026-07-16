import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TextInput } from "./TextInput";

const meta: Meta<typeof TextInput> = {
  title: "Fields/TextInput",
  component: TextInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextInput>;

function Controlled(props: Partial<React.ComponentProps<typeof TextInput>>) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <TextInput
      id="demo"
      label="First Name"
      value={value}
      onChange={setValue}
      {...props}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

export const Required: Story = {
  render: () => <Controlled required label="Last Name" />,
};

export const WithPlaceholder: Story = {
  render: () => <Controlled placeholder="e.g. Smith" label="Last Name" />,
};

export const Prefilled: Story = {
  render: () => <Controlled value="Daniel" label="First Name" />,
};
