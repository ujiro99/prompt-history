import { Page, Locator } from "@playwright/test"
import { TestIds } from "@/components/const"

export class InputPopup {
  private readonly popupSelector = `[data-testid="${TestIds.inputPopup.popup}"]`
  private readonly historyTriggerSelector = `[data-testid="${TestIds.inputPopup.historyTrigger}"]`
  private readonly historyListSelector = `[data-testid="${TestIds.inputPopup.historyList}"]`
  private readonly historyItemSelector = `[data-testid="${TestIds.inputPopup.historyItem}"]`

  constructor(private page: Page) {}

  async isVisible(): Promise<boolean> {
    const popup = this.page.locator(this.popupSelector)
    return await popup.isVisible()
  }

  async waitPopup(): Promise<void> {
    await this.page.waitForSelector(this.popupSelector, { state: "visible" })
  }

  async getHistoryTrigger(): Promise<Locator> {
    return this.page.locator(this.historyTriggerSelector).first()
  }

  async waitHistory(): Promise<void> {
    await this.page.waitForSelector(this.historyTriggerSelector, {
      state: "visible",
    })
  }

  async getHistoryList(): Promise<Locator> {
    return this.page.locator(this.historyListSelector).first()
  }

  async getHistoryItems(): Promise<Locator[]> {
    return this.page.locator(this.historyItemSelector).all()
  }

  async selectHistoryItem(index: number): Promise<void> {
    const items = await this.getHistoryItems()
    if (items[index]) {
      await items[index].click()
    }
  }

  async close(): Promise<void> {
    await this.page.keyboard.press("Escape")
  }
}
