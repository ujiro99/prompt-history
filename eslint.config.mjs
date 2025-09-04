import js from "@eslint/js"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      react: react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // React rules
      "react/react-in-jsx-scope": "off", // React 17+ JSX transform
      "react/prop-types": "off", // We use TypeScript

      // General rules
      "no-console": "warn",
      "no-debugger": "error",
      "no-unused-vars": "off", // Use TypeScript version instead
      "prefer-const": "error",
      "no-var": "error",

      // Style rules
      "comma-dangle": ["error", "always-multiline"],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "**/*.spec.{js,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".output/**",
      "dist/**",
      ".wxt/**",
      "coverage/**",
    ],
  },
]
