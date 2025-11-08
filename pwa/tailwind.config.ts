import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "deep-navy": "var(--color-deep-navy)",
        "icp-cyan": "var(--color-icp-cyan)",
        "bitcoin-gold": "var(--color-bitcoin-gold)",
        "success-green": "var(--color-success-green)",
        "warning-amber": "var(--color-warning-amber)",
        "error-red": "var(--color-error-red)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-disabled": "var(--color-text-disabled)",
        "card-background": "var(--color-card-background)",
        "border-subtle": "var(--color-border-subtle)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: [
          "var(--font-space-grotesk)",
          "Space Grotesk",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        vault: "0px 8px 32px rgba(0, 0, 0, 0.3)",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
