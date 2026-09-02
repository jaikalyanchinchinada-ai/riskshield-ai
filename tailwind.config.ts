import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "#0B1220",
          panel: "#111A2C",
          raised: "#182236",
          border: "#243149",
          muted: "#8A97B0",
        },
        canvas: {
          DEFAULT: "#F5F7FA",
          panel: "#FFFFFF",
          border: "#E3E8F0",
          muted: "#64748B",
        },
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          400: "#7C8FFF",
          500: "#4F6BFF",
          600: "#3A52E0",
          700: "#2C3FB8",
        },
        risk: {
          low: "#16A34A",
          lowBg: "#DCFCE7",
          medium: "#CA8A04",
          mediumBg: "#FEF9C3",
          high: "#EA580C",
          highBg: "#FFEDD5",
          critical: "#DC2626",
          criticalBg: "#FEE2E2",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.06), 0 1px 3px 0 rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
