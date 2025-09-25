import { BasePage, Selectors } from "./BasePage"

export class GeminiPage extends BasePage {
  static readonly url = "https://gemini.google.com"

  constructor(page: any) {
    super(page, "Gemini")
  }

  async navigate(): Promise<void> {
    await this.page.goto(GeminiPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // Wait until input field is displayed
    await this.page.waitForSelector(this.selectors.textInput[0], {
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
      textInput: this.selectors.textInput[0],
      sendButton: `${this.selectors.sendButton[2]}, ${this.selectors.sendButton[0]}`,
    }
  }
}
