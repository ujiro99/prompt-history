import { BasePage, Selectors } from "./BasePage"
import { GEMINI_DEFINITIONS } from "@/services/aiService/gemini/geminiDefinitions"

const selectors = GEMINI_DEFINITIONS.selectors

export class GeminiPage extends BasePage {
  static readonly url = "https://gemini.google.com"

  async navigate(): Promise<void> {
    await this.page.goto(GeminiPage.url)
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
      sendButton: `${selectors.sendButton[2]}, ${selectors.sendButton[0]}`,
    }
  }
}
