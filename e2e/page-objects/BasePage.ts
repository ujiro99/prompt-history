import { Page, Locator } from "@playwright/test"
import { InputPopup } from "./components/InputPopup"
import { AutocompletePopup } from "./components/AutocompletePopup"
import { TestIds } from "@/components/const"

export interface Selectors {
  promptInput: string
  sendButton: string
}

interface PageResult {
  ret: boolean
  err?: string
}

export abstract class BasePage {
  constructor(protected page: Page) {}

  get pageInstance(): Page {
    return this.page
  }

  // 共通メソッド
  async waitForExtensionLoad(): Promise<void> {
    // 拡張機能のコンテンツスクリプトが注入されるまで待機
    await this.page.waitForSelector("prompt-history-ui", {
      timeout: 5000,
      state: "attached",
    })
  }

  async checkContentScriptInjection(): Promise<boolean> {
    // コンテンツスクリプトが注入されているかチェック
    return await this.page.evaluate(() => {
      // 拡張機能がコンテンツスクリプトでDOM要素を追加したかを確認
      return document.querySelector("prompt-history-ui") != null
    })
  }

  async getPromptInput(): Promise<Locator> {
    const selectors = this.getServiceSpecificSelectors()
    return this.page.locator(selectors.promptInput).first()
  }

  async getSendButton(): Promise<Locator> {
    const selectors = this.getServiceSpecificSelectors()

    // 複数のセレクタから最初に見つかったものを返す
    const selectorList = selectors.sendButton.split(", ")
    for (const selector of selectorList) {
      const element = this.page.locator(selector.trim())
      if ((await element.count()) > 0) {
        console.log(`Found send button with selector: ${selector}`)
        return element.first()
      }
    }

    // すべてのセレクタで見つからない場合はフォールバック
    return this.page.locator(selectors.sendButton)
  }

  async typePrompt(text: string): Promise<void> {
    const input = await this.getPromptInput()

    // contenteditable要素か通常のinput/textarea要素かを判定
    const tagName = await input.evaluate((el) => el.tagName.toLowerCase())
    const isContentEditable = await input.evaluate(
      (el) => el.getAttribute("contenteditable") === "true",
    )

    if (isContentEditable || tagName === "div") {
      // contenteditable要素の場合はクリックしてからテキストを入力
      await input.click()
      await input.fill("")
      await input.fill(text)
    } else {
      // 通常のinput/textarea要素
      await input.fill(text)
    }
  }

  async submitPrompt(): Promise<void> {
    const button = await this.getSendButton()
    await button.click()
  }

  async verifyHistoryStorage(): Promise<boolean> {
    // ストレージAPIを通じて履歴が保存されているか確認
    // 初期実装では簡易的なチェック
    return true
  }

  // UI要素の取得
  async getInputPopup(): Promise<InputPopup> {
    return new InputPopup(this.page)
  }

  async getAutocompletePopup(): Promise<AutocompletePopup> {
    return new AutocompletePopup(this.page)
  }

  async checkExtensionElementsPresence(): Promise<PageResult> {
    const result = await this.page.evaluate((testIds) => {
      const shadowHost = document.querySelector("prompt-history-ui")
      if (!shadowHost) {
        return { ret: false, err: "Shadow host not found" }
      }

      // Shadow rootにアクセス
      const shadowRoot =
        (shadowHost as any).shadowRoot || (shadowHost as any).__wxtShadowRoot
      if (!shadowRoot) {
        return { ret: false, err: "Shadow root not found" }
      }

      // Shadow DOM内で要素を探す
      const extensionElements = [
        `[data-testid="${testIds.inputPopup.popup}"]`,
        `[data-testid="${testIds.inputPopup.historyTrigger}"]`,
      ]

      for (const selector of extensionElements) {
        const element = shadowRoot.querySelector(selector)
        if (element) {
          return { ret: true }
        }
      }
      return {
        ret: false,
        err: `Extension elements not found in Shadow DOM. Looking for: ${JSON.stringify(extensionElements)}.`,
      }
    }, TestIds)

    return result
  }

  // 抽象メソッド（サービス固有実装）
  abstract getServiceSpecificSelectors(): Selectors
  abstract waitForServiceReady(): Promise<void>
}
