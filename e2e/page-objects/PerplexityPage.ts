import { BasePage, Selectors } from "./BasePage"

export class PerplexityPage extends BasePage {
  static readonly url = "https://www.perplexity.ai/"

  constructor(page: any) {
    super(page, "Perplexity")
  }

  async navigate(): Promise<void> {
    await this.page.goto(PerplexityPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // Wait until input field is displayed
    await this.page.waitForSelector(this.selectors.textInput[0], {
      timeout: 5000,
    })

    // Wait until shadow host exists
    await this.page.waitForSelector("prompt-autocraft-ui", {
      timeout: 5000,
      state: "attached",
    })
  }

  getServiceSpecificSelectors(): Selectors {
    // Use more specific selectors with priority
    return {
      textInput: this.selectors.textInput[0],
      sendButton: `${this.selectors.sendButton[1]}, ${this.selectors.sendButton[0]}`,
    }
  }
}
