import { DomManager } from "./domManager"

/**
 * プロンプトの抽出・挿入を担当するクラス
 */
export class PromptManager {
  constructor(private domManager: DomManager) {}

  /**
   * プロンプト内容抽出
   */
  extractContent(): string {
    const input = this.domManager.getTextInput()
    if (!input) {
      console.warn("ChatGPT text input not found")
      return ""
    }

    // contenteditable div の場合
    if (input.getAttribute("contenteditable") === "true") {
      const element = input as HTMLElement
      // HTMLタグを除去してプレーンテキストを取得
      return element.innerText || element.textContent || ""
    }

    // textarea の場合
    if (input.tagName.toLowerCase() === "textarea") {
      return (input as HTMLTextAreaElement).value || ""
    }

    // input の場合
    if (input.tagName.toLowerCase() === "input") {
      return (input as HTMLInputElement).value || ""
    }

    // フォールバック
    const element = input as HTMLElement
    return element.textContent || element.innerText || ""
  }

  /**
   * プロンプト内容挿入
   */
  injectContent(content: string): void {
    const input = this.domManager.getTextInput()
    if (!input) {
      console.warn("ChatGPT text input not found")
      return
    }

    try {
      // contenteditable div の場合
      if (input.getAttribute("contenteditable") === "true") {
        const element = input as HTMLElement

        // フォーカスを当てる
        element.focus()

        // 既存の内容をクリア
        element.innerHTML = ""
        element.textContent = content

        // 入力イベントを発火
        this.triggerInputEvents(element)

        // カーソルを末尾に移動
        this.setCursorToEnd(element)
        return
      }

      // textarea または input の場合
      if (
        input.tagName.toLowerCase() === "textarea" ||
        input.tagName.toLowerCase() === "input"
      ) {
        const inputElement = input as HTMLTextAreaElement | HTMLInputElement

        // フォーカスを当てる
        inputElement.focus()

        // 値を設定
        inputElement.value = content

        // 入力イベントを発火
        this.triggerInputEvents(inputElement)

        // カーソルを末尾に移動
        inputElement.selectionStart = inputElement.selectionEnd = content.length
        return
      }

      console.warn("Unsupported input element type")
    } catch (error) {
      console.error("Failed to inject prompt content:", error)
    }
  }

  /**
   * 入力イベント発火
   */
  private triggerInputEvents(element: Element): void {
    // input イベント
    element.dispatchEvent(
      new Event("input", { bubbles: true, cancelable: true }),
    )

    // change イベント
    element.dispatchEvent(
      new Event("change", { bubbles: true, cancelable: true }),
    )

    // compositionupdate イベント（IME対応）
    element.dispatchEvent(
      new CompositionEvent("compositionupdate", { bubbles: true, data: "" }),
    )

    // React/Vue対応のため、より詳細な InputEvent
    if (typeof InputEvent !== "undefined") {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
        }),
      )
    }
  }

  /**
   * contenteditable要素のカーソルを末尾に移動
   */
  private setCursorToEnd(element: HTMLElement): void {
    if (window.getSelection && document.createRange) {
      const selection = window.getSelection()
      const range = document.createRange()

      if (element.childNodes.length > 0) {
        range.selectNodeContents(element)
        range.collapse(false) // 末尾に移動
      } else {
        range.setStart(element, 0)
        range.setEnd(element, 0)
      }

      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }
}
