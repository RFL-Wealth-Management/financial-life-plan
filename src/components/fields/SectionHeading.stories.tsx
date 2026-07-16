import type { Meta, StoryObj } from "@storybook/react";
import { SectionHeading } from "./SectionHeading";

const meta: Meta<typeof SectionHeading> = {
  title: "Fields/SectionHeading",
  component: SectionHeading,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, fontFamily: "IBM Plex Sans, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SectionHeading>;

export const Default: Story = {
  args: {
    title: "Profile",
  },
};

export const WithDescription: Story = {
  args: {
    title: "Retirement Buckets",
    description: "Breakdown of your projected retirement savings by account type",
  },
};

export const LongTitle: Story = {
  args: {
    title: "Your Retirement Income Summary",
    description: "Combined income projections for both clients",
  },
};
