import { BasePage, Selectors } from "./BasePage"

export class StableDiffusionPage extends BasePage {
  static readonly url = "https://stablediffusionweb.com/app/image-generator"

  constructor(page: any) {
    super(page, "Stable Diffusion")
  }

  async navigate(): Promise<void> {
    await this.page.goto(StableDiffusionPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // login form
    await this.page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await this.page
      .locator('input[name="email"]')
      .fill(process.env.STABLE_DIFFUSION_ID as string)
    await this.page
      .locator('input[name="password"]')
      .fill(process.env.STABLE_DIFFUSION_PW as string)
    await this.page.getByRole("button", { name: "Sign in" }).click()

    // Wait until input field is displayed
    await this.page.waitForSelector(this.selectors.textInput[1], {
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
      textInput: this.selectors.textInput[1],
      sendButton: this.selectors.sendButton[1],
    }
  }
}
