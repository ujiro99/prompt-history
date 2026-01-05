import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        plugins: [WxtVitest()],
        test: {
          name: {
            label: "browser",
            color: "green",
          },
          include: ["**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [WxtVitest()],
        test: {
          name: {
            label: "middle",
            color: "blue",
          },
          include: ["**/*.test.ts"],
          environment: "node",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
    mockReset: true,
    restoreMocks: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{git}/**"],
  },
})
