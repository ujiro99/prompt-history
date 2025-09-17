import { Page, Locator, expect } from "@playwright/test"

export class WaitHelpers {
  constructor(private page: Page) {}

  // Wait until extension injects content script
  async waitForContentScriptInjection(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        // Check if extension has set global variables
        return (
          typeof (window as Window & { promptHistoryExtension?: unknown })
            .promptHistoryExtension !== "undefined" ||
          document.querySelector('[data-extension="prompt-history"]') !== null
        )
      },
      { timeout },
    )
  }

  // Wait until specific element is displayed (multiple selectors supported)
  async waitForAnyElement(
    selectors: string[],
    timeout = 5000,
  ): Promise<string> {
    const promises = selectors.map(async (selector) => {
      try {
        await this.page.waitForSelector(selector, { timeout })
        return selector
      } catch {
        throw new Error(`Element not found: ${selector}`)
      }
    })

    return Promise.any(promises)
  }

  // Wait until element becomes clickable
  async waitForClickable(selector: string, timeout = 5000): Promise<Locator> {
    const element = this.page.locator(selector)
    await expect(element).toBeVisible({ timeout })
    await expect(element).toBeEnabled({ timeout })
    return element
  }

  // Wait until page load completes
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle")
    await this.page.waitForLoadState("domcontentloaded")
  }

  // Wait until specified condition is met
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<void> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return
      }
      await this.page.waitForTimeout(interval)
    }
    throw new Error(`Condition not met within ${timeout}ms`)
  }

  // Wait until extension UI elements are displayed
  async waitForExtensionUI(timeout = 5000): Promise<void> {
    const extensionSelectors = [
      '[data-testid="prompt-history-trigger"]',
      '[data-extension="prompt-history"]',
      '[data-testid="input-popup"]',
      '[data-testid="autocomplete-popup"]',
    ]

    try {
      await this.waitForAnyElement(extensionSelectors, timeout)
    } catch {
      // Only warning if extension UI elements are not found
      // Extension UI elements not found within timeout
    }
  }
}
