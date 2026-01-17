import { BasePage, Selectors } from "./BasePage"

export class TestPage extends BasePage {
  static readonly url = "https://ujiro99.github.io/selection-command/en/test"

  constructor(page: any) {
    super(page, "TestPage")
  }

  async navigate(): Promise<void> {
    await this.page.goto(TestPage.url)
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
      sendButton: this.selectors.sendButton[0],
    }
  }
}
