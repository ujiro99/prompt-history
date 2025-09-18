import { Page, Locator } from "@playwright/test"
import { TestIds } from "@/components/const"

export class AutocompletePopup {
  private readonly popupSelector = `[data-testid="${TestIds.autocomplete.popup}"]`
  private readonly suggestionItemSelector = `[data-testid="${TestIds.autocomplete.item}"]`
  private readonly activeItemSelector = `[data-testid="${TestIds.autocomplete.item}"].active`

  constructor(private page: Page) {}

  async isVisible(): Promise<boolean> {
    const popup = this.page.locator(this.popupSelector)
    return await popup.isVisible()
  }

  async waitForDisplay(): Promise<void> {
    await this.page.waitForSelector(this.popupSelector, { state: "visible" })
  }

  async getSuggestions(): Promise<Locator[]> {
    const items = await this.page.locator(this.suggestionItemSelector).all()
    return items
  }

  async pressArrowUp(): Promise<void> {
    await this.page.keyboard.press("ArrowUp")
  }

  async pressArrowDown(): Promise<void> {
    await this.page.keyboard.press("ArrowDown")
  }

  async pressCtrlN(): Promise<void> {
    await this.page.keyboard.press("Control+n")
  }

  async pressCtrlP(): Promise<void> {
    await this.page.keyboard.press("Control+p")
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press("Tab")
  }

  async cancel(): Promise<void> {
    await this.page.keyboard.press("Escape")
  }

  async getActiveItem(): Promise<Locator | null> {
    const activeItem = this.page.locator(this.activeItemSelector)
    const count = await activeItem.count()
    return count > 0 ? activeItem : null
  }

  async waitActiveItem(): Promise<void> {
    await this.page.waitForSelector(this.activeItemSelector, {
      state: "visible",
    })
  }
}
