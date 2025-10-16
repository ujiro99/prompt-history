import { BasePage, Selectors } from "./BasePage"
import { Page } from "@playwright/test"
import { WaitHelpers } from "../utils/wait-helpers"

export class StableDiffusionPage extends BasePage {
  static readonly url = "https://stablediffusionweb.com/app/image-generator"

  constructor(page: Page) {
    super(page, "Stable Diffusion")
  }

  async navigate(): Promise<void> {
    await this.page.goto(StableDiffusionPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    const waitHelpers = new WaitHelpers(this.page)
    const email = process.env.STABLE_DIFFUSION_ID
    const password = process.env.STABLE_DIFFUSION_PW

    if (!email || !password) {
      throw new Error(
        "STABLE_DIFFUSION_ID and STABLE_DIFFUSION_PW must be set in .env.e2e",
      )
    }

    // login form
    await this.page.waitForSelector('input[name="email"]', { timeout: 10000 })
    const emailInput = this.page.locator('input[name="email"]')
    const passwordInput = this.page.locator('input[name="password"]')
    const signInButton = this.page.getByRole("button", { name: "Sign in" })

    // Fill in the form
    await emailInput.fill(email)
    await passwordInput.fill(password)
    await waitHelpers.waitForCondition(async () => {
      const emailText = await emailInput.inputValue()
      const passwordText = await passwordInput.inputValue()
      return emailText === email && passwordText === password
    }, 5000)
    await signInButton.click()

    await this.page.waitForTimeout(200)

    if ((await emailInput.isVisible()) && (await signInButton.isVisible())) {
      // Retry if login form is still visible
      await emailInput.fill(email)
      await passwordInput.fill(password)
      await waitHelpers.waitForCondition(async () => {
        const emailText = await emailInput.inputValue()
        const passwordText = await passwordInput.inputValue()
        return emailText === email && passwordText === password
      }, 5000)
      await signInButton.click({ timeout: 5000 })
    }

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
