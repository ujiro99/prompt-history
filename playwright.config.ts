import { defineConfig, devices } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
import * as dotenv from "dotenv"

// Load .env.e2e file for E2E tests
dotenv.config({ path: ".env.e2e" })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["junit", { outputFile: "test-results/junit.xml" }]],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.CI ? true : false,
    locale: "en-US",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 拡張機能のロード設定
        launchOptions: {
          // ビルド済み拡張機能のパス
          args: [
            `--disable-extensions-except=${path.join(__dirname, ".output/chrome-mv3-e2e")}`,
            `--load-extension=${path.join(__dirname, ".output/chrome-mv3-e2e")}`,
          ],
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Firefoxの拡張機能ロードは別途実装が必要
      },
    },
  ],

  // テスト前のグローバル設定
  globalSetup: "./e2e/fixtures/global-setup.ts",
  globalTeardown: "./e2e/fixtures/global-teardown.ts",
})
