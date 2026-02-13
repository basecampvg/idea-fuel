import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "node_modules/",
      "MVP/",
      "**/dist/",
      "**/.next/",
      "**/coverage/",
      "packages/mobile/",
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript rules (no type-checking for speed)
  ...tseslint.configs.recommended,

  // React Hooks for web package
  {
    files: ["packages/web/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },

  // Shared settings
  {
    rules: {
      // Relax rules that are noisy in existing codebases
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
