import type { StorybookConfig } from "@storybook/react-vite"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
  ],
  framework: "@storybook/react-vite",
  async viteFinal(config) {
    // Allow WXT_ prefixed environment variables in Storybook
    config.envPrefix = config.envPrefix || []
    if (Array.isArray(config.envPrefix)) {
      config.envPrefix.push("WXT_")
    } else {
      config.envPrefix = [config.envPrefix, "WXT_"]
    }

    // Configure path aliases using array format for precise control
    // Using regex with ^ and $ anchors ensures exact matching, avoiding prefix conflicts
    config.resolve = config.resolve || {}
    config.resolve.alias = [
      // Exact matches using regex (MUST come first)
      {
        find: /^@\/services\/storage\/lazyStorage$/,
        replacement: resolve(__dirname, "./mocks/lazyStorage.ts"),
      },
      {
        find: /^@\/services\/storage\/definitions$/,
        replacement: resolve(__dirname, "./mocks/storage.ts"),
      },
      {
        find: /^@\/services\/storage\/improvePromptCache$/,
        replacement: resolve(__dirname, "./mocks/improvePromptCache.ts"),
      },
      {
        find: /^@\/services\/analytics$/,
        replacement: resolve(__dirname, "./mocks/analytics.ts"),
      },
      {
        find: /^@\/hooks\/useLazyStorage$/,
        replacement: resolve(__dirname, "./mocks/useLazyStorage.ts"),
      },
      {
        find: /^@\/services\/storage\/genaiApiKey$/,
        replacement: resolve(__dirname, "./mocks/genaiApiKey.ts"),
      },
      {
        find: /^wxt\/utils\/storage$/,
        replacement: resolve(__dirname, "./mocks/wxt-storage.ts"),
      },
      {
        find: /^#imports$/,
        replacement: resolve(__dirname, "./mocks/i18n.ts"),
      },
      // Prefix match for general @ alias (MUST come last)
      { find: "@", replacement: resolve(__dirname, "../src") },
    ]

    // Add Tailwind CSS plugin
    config.plugins = config.plugins || []
    config.plugins.push(tailwindcss())

    return config
  },
}
export default config
