import { BasePage, Selectors } from "./BasePage"

export class SkyworkPage extends BasePage {
  static readonly url = "https://skywork.ai/"

  constructor(page: any) {
    super(page, "Skywork")
  }

  async navigate(): Promise<void> {
    await this.page.goto(SkyworkPage.url)
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
      sendButton: this.selectors.sendButton[0],
    }
  }
}
