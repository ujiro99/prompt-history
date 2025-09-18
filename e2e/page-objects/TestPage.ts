import { BasePage, Selectors } from "./BasePage"
import { CHATGPT_DEFINITIONS } from "@/services/aiService/chatgpt/chatGptDefinitions"

const selectors = CHATGPT_DEFINITIONS.selectors

export class TestPage extends BasePage {
  static readonly url = "https://ujiro99.github.io/selection-command/en/test"

  async navigate(): Promise<void> {
    await this.page.goto(TestPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // Wait until input field is displayed
    await this.page.waitForSelector(selectors.textInput[3], {
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
      promptInput: selectors.textInput[3],
      sendButton: selectors.sendButton[4],
    }
  }
}
