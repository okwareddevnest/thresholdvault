import jsxA11y from "eslint-plugin-jsx-a11y";
import tailwind from "eslint-plugin-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    plugins: {
      "jsx-a11y": jsxA11y,
      tailwindcss: tailwind,
    },
    rules: {
      "no-console": "error",
      "no-alert": "error",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/no-autofocus": "warn",
      "tailwindcss/no-custom-classname": "off",
      "no-warning-comments": [
        "error",
        { terms: ["todo", "fixme", "hack", "temp", "placeholder"], location: "anywhere" },
      ],
    },
    settings: {
      tailwindcss: {
        callees: ["cn"],
        config: "tailwind.config.ts",
      },
    },
  },
]);

export default eslintConfig;
