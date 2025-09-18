import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing"

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    globals: true,
    environment: "node",
    mockReset: true,
    restoreMocks: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{git}/**"],
  },
})
