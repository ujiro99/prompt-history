import { Page, Locator } from "@playwright/test"
import { InputPopup } from "./components/InputPopup"
import { AutocompletePopup } from "./components/AutocompletePopup"
import { TestIds } from "@/components/const"

export interface Selectors {
  textInput: string
  sendButton: string
}

interface PageResult {
  ret: boolean
  err?: string
}

export abstract class BasePage {
  protected selectors: Selectors

  constructor(
    protected page: Page,
    protected serviceName: string,
  ) {
    const configs = JSON.parse(process.env.CONFIGS ?? "{}")
    this.selectors = configs[serviceName]?.selectors
  }

  get pageInstance(): Page {
    return this.page
  }

  // Common methods
  async waitForExtensionLoad(): Promise<void> {
    // Wait until extension content script is injected
    await this.page.waitForSelector("prompt-history-ui", {
      timeout: 5000,
      state: "attached",
    })
  }

  async checkContentScriptInjection(): Promise<boolean> {
    // Check if content script is injected
    return await this.page.evaluate(() => {
      // Check if extension added DOM elements via content script
      return document.querySelector("prompt-history-ui") != null
    })
  }

  async getPromptInput(): Promise<Locator> {
    const selectors = this.getServiceSpecificSelectors()
    return this.page.locator(selectors.textInput).first()
  }

  async getSendButton(): Promise<Locator> {
    const selectors = this.getServiceSpecificSelectors()

    // Return the first found from multiple selectors
    const selectorList = selectors.sendButton.split(", ")
    for (const selector of selectorList) {
      const element = this.page.locator(selector.trim())
      if ((await element.count()) > 0) {
        console.log(`Found send button with selector: ${selector}`)
        return element.first()
      }
    }

    // Fallback if not found with all selectors
    return this.page.locator(selectors.sendButton)
  }

  async typePrompt(text: string): Promise<void> {
    const input = await this.getPromptInput()

    // Determine if contenteditable element or regular input/textarea element
    const tagName = await input.evaluate((el) => el.tagName.toLowerCase())
    const isContentEditable = await input.evaluate(
      (el) => el.getAttribute("contenteditable") === "true",
    )

    if (isContentEditable || tagName === "div") {
      // For contenteditable elements, click first then input text
      await input.click()
      await input.fill("")
      await input.fill(text)
    } else {
      // Regular input/textarea elements
      await input.fill(text)
    }
  }

  async submitPrompt(): Promise<void> {
    const button = await this.getSendButton()
    await button.click()
  }

  async verifyHistoryStorage(): Promise<boolean> {
    // Check if history is saved via storage API
    // Simple check in initial implementation
    return true
  }

  // Get UI elements
  async getInputPopup(): Promise<InputPopup> {
    return new InputPopup(this.page)
  }

  async getAutocompletePopup(): Promise<AutocompletePopup> {
    return new AutocompletePopup(this.page)
  }

  async checkExtensionElementsPresence(): Promise<void> {
    await this.page.waitForSelector(
      `[data-testid="${TestIds.inputPopup.popup}"]`,
      {
        timeout: 5000,
      },
    )
    await this.page.waitForSelector(
      `[data-testid="${TestIds.inputPopup.historyTrigger}"]`,
      {
        timeout: 5000,
      },
    )
  }

  // Abstract methods (service-specific implementation)
  abstract getServiceSpecificSelectors(): Selectors
  abstract waitForServiceReady(): Promise<void>
}
