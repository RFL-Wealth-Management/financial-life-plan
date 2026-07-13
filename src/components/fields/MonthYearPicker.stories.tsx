import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MonthYearPicker } from "./MonthYearPicker";

const meta: Meta<typeof MonthYearPicker> = {
  title: "Fields/MonthYearPicker",
  component: MonthYearPicker,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MonthYearPicker>;

function Controlled(
  props: Partial<React.ComponentProps<typeof MonthYearPicker>>
) {
  const [month, setMonth] = useState(props.month ?? "January");
  const [year, setYear] = useState(props.year ?? 2026);
  return (
    <div>
      <MonthYearPicker
        id="demo"
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
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
        Selected: {month} {year}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
  name: "Default (January 2026)",
};

export const CustomLabel: Story = {
  render: () => <Controlled label="Plan Date" />,
};

export const PreselectedJuly: Story = {
  render: () => <Controlled month="July" year={2027} />,
  name: "Preselected (July 2027)",
};
