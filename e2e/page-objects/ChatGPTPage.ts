import { BasePage, Selectors } from "./BasePage"
import { CHATGPT_DEFINITIONS } from "../../services/aiService/chatgpt/chatGptDefinitions"

const selectors = CHATGPT_DEFINITIONS.selectors

export class ChatGPTPage extends BasePage {
  static readonly url = "https://chatgpt.com"

  async navigate(): Promise<void> {
    await this.page.goto(ChatGPTPage.url)
  }

  async waitForServiceReady(): Promise<void> {
    // 入力欄が表示されるまで待機
    await this.page.waitForSelector(selectors.textInput[0], {
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
      promptInput: selectors.textInput[0],
      sendButton: `${selectors.sendButton[0]}, ${selectors.sendButton[1]}`,
    }
  }
}
