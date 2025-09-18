import { Page } from "@playwright/test"

export class WaitHelpers {
  constructor(private page: Page) {}

  // Wait until specified condition is met
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 2000,
    interval = 20,
  ): Promise<void> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return
      }
      await this.page.waitForTimeout(interval)
    }
    console.warn(`Condition not met within ${timeout}ms`)
  }
}
