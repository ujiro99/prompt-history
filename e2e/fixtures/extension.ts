import { test as base, chromium, type BrowserContext } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  sw: any
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, "../../.output/chrome-mv3-e2e")
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent("serviceworker")
    }

    const extensionId = background.url().split("/")[2]
    await use(extensionId)
  },
})

export const expect = test.expect
