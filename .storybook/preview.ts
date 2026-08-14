import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        fflp: { name: "fflp", value: "#FFFEF4" },
        white: { name: "white", value: "#ffffff" },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "fflp" },
  },
};

export default preview;
