import { CHATGPT_SELECTORS } from "./chatGptSelectors"

/**
 * デバッグ・ユーティリティを担当するクラス
 */
export class ChatGptDebugger {
  /**
   * 要素の可視性チェック
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      parseFloat(style.opacity) > 0
    )
  }

  /**
   * 現在検出されている要素情報を取得
   */
  getElementInfo(): {
    textInput: { found: boolean; selector?: string; tagName?: string }
    sendButton: { found: boolean; selector?: string; tagName?: string }
  } {
    const findElementWithSelector = (selectors: string[]) => {
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector)
          if (element && this.isElementVisible(element)) {
            return {
              found: true,
              selector,
              tagName: element.tagName.toLowerCase(),
            }
          }
        } catch (error) {
          console.error(error)
        }
      }
      return { found: false }
    }

    return {
      textInput: findElementWithSelector(CHATGPT_SELECTORS.textInput),
      sendButton: findElementWithSelector(CHATGPT_SELECTORS.sendButton),
    }
  }

  /**
   * セレクタのテスト実行
   */
  testSelectors(): void {
    console.group("ChatGPT Selectors Test")

    console.log("Text Input Selectors:")
    CHATGPT_SELECTORS.textInput.forEach((selector, index) => {
      try {
        const element = document.querySelector(selector)
        console.log(`${index + 1}. ${selector}:`, element ? "✓" : "✗")
      } catch (error) {
        console.log(`${index + 1}. ${selector}:`, "✗ (Error)", error)
      }
    })

    console.log("Send Button Selectors:")
    CHATGPT_SELECTORS.sendButton.forEach((selector, index) => {
      try {
        const element = document.querySelector(selector)
        console.log(`${index + 1}. ${selector}:`, element ? "✓" : "✗")
      } catch (error) {
        console.log(`${index + 1}. ${selector}:`, "✗ (Error)", error)
      }
    })

    console.groupEnd()
  }
}
