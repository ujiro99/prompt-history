import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing"

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: { label: "browser", color: "green" },
          include: ["**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: { label: "middle", color: "blue" },
          include: ["**/*.test.ts"],
          environment: "node",
        },
      },
    ],
    mockReset: true,
    restoreMocks: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{git}/**"],
  },
})
