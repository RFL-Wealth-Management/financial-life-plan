import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "fflp",
      values: [
        { name: "fflp", value: "#FFFEF4" },
        { name: "white", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
