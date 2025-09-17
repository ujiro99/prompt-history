import { BasePage, Selectors } from "./BasePage"
import { CHATGPT_DEFINITIONS } from "@/services/aiService/chatgpt/chatGptDefinitions"

const selectors = CHATGPT_DEFINITIONS.selectors

export class TestPage extends BasePage {
  static readonly url = "https://ujiro99.github.io/selection-command/en/test"

  async navigate(): Promise<void> {
    await this.page.goto(TestPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // 入力欄が表示されるまで待機
    await this.page.waitForSelector(selectors.textInput[3], {
      timeout: 5000,
    })

    // Shadow hostが存在するまで待機
    await this.page.waitForSelector("prompt-history-ui", {
      timeout: 5000,
      state: "attached",
    })
  }

  getServiceSpecificSelectors(): Selectors {
    // より特定的なセレクタを優先使用
    return {
      promptInput: selectors.textInput[3],
      sendButton: selectors.sendButton[7],
    }
  }
}
