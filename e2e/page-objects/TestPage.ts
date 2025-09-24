import { BasePage, Selectors } from "./BasePage"
import { DEFINITIONS } from "@/services/aiService/testPage/testPageDefinitions"

const selectors = DEFINITIONS.selectors

export class TestPage extends BasePage {
  static readonly url = "https://ujiro99.github.io/selection-command/en/test"

  async navigate(): Promise<void> {
    await this.page.goto(TestPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // Wait until input field is displayed
    await this.page.waitForSelector(selectors.textInput[0], {
      timeout: 5000,
    })

    // Wait until shadow host exists
    await this.page.waitForSelector("prompt-history-ui", {
      timeout: 5000,
      state: "attached",
    })
  }

  getServiceSpecificSelectors(): Selectors {
    // Use more specific selectors with priority
    return {
      promptInput: selectors.textInput[0],
      sendButton: selectors.sendButton[0],
    }
  }
}
