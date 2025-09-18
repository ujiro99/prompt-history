import js from "@eslint/js"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"

export default [
  js.configs.recommended,
  // Base configuration for all TypeScript/JavaScript files
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
      globals: {
        // Common globals available in all contexts
        ...globals.es2021,
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
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // React rules
      "react/react-in-jsx-scope": "off", // React 17+ JSX transform
      "react/prop-types": "off", // We use TypeScript

      // General rules
      "no-console": "off",
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
  // Configuration for React components and content scripts (browser environment)
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        // React globals (needed for type annotations)
        React: "readonly",
        // WebExtension globals
        browser: "readonly",
        chrome: "readonly",
        // WXT globals for content scripts
        defineContentScript: "readonly",
        createShadowRootUi: "readonly",
      },
    },
  },
  // Configuration for background scripts (WebExtension environment)
  {
    files: ["src/entrypoints/background*.{js,ts}"],
    languageOptions: {
      globals: {
        console: "readonly",
        // WebExtension globals
        browser: "readonly",
        chrome: "readonly",
        // WXT globals for background
        defineBackground: "readonly",
      },
    },
  },
  // Configuration for config files (Node.js environment)
  {
    files: [
      "*.config.{js,ts,mjs}",
      "vitest.config.{js,ts}",
      "wxt.config.{js,ts}",
      "tailwind.config.{js,ts}",
      "src/app.config.{js,ts}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        // WXT globals for config
        defineAppConfig: "readonly",
      },
    },
    rules: {
      "no-console": "off", // Allow console in config files
    },
  },
  // Configuration for test files
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "**/*.spec.{js,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Configuration for e2e test files
  {
    files: ["e2e/**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        // Playwright globals
        test: "readonly",
        expect: "readonly",
        // Browser globals needed for page.evaluate
        console: "readonly",
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        Window: "readonly",
        // Chrome extension APIs
        chrome: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "off", // Playwright fixtures use 'use'
      "no-undef": "off", // Page.evaluate runs in browser context
      "no-empty-pattern": "off", // Ignore empty destructuring in test fixtures
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
