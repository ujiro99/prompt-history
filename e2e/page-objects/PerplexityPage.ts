import { BasePage, Selectors } from "./BasePage"
import { PERPLEXITY_DEFINITIONS } from "../../services/aiService/perplexity/perplexityDefinitions"

const selectors = PERPLEXITY_DEFINITIONS.selectors

export class PerplexityPage extends BasePage {
  static readonly url = "https://www.perplexity.ai/"

  async navigate(): Promise<void> {
    await this.page.goto(PerplexityPage.url)
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
      sendButton: `${selectors.sendButton[1]}, ${selectors.sendButton[0]}`,
    }
  }
}
