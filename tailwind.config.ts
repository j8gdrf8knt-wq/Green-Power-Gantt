import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gp: {
          dark:  "#1a5c1a",
          mid:   "#2e7d2e",
          light: "#eaf5ea",
          border:"#d4e4d4",
          odd:   "#f8fdf8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
