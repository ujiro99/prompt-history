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
    // Add path alias
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": resolve(__dirname, "../src"),
      "#imports": resolve(__dirname, "./mocks/i18n.ts"),
      "@/services/storage/definitions": resolve(
        __dirname,
        "./mocks/storage.ts",
      ),
      "@/services/storage/improvePromptCache": resolve(
        __dirname,
        "./mocks/improvePromptCache.ts",
      ),
      "@/services/analytics": resolve(__dirname, "./mocks/analytics.ts"),
    }

    // Add Tailwind CSS plugin
    config.plugins = config.plugins || []
    config.plugins.push(tailwindcss())

    return config
  },
}
export default config
