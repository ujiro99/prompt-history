import { CHATGPT_SELECTORS } from "./chatGptSelectors"

/**
 * DOM要素管理とイベント処理を担当するクラス
 */
export class DomManager {
  private textInput: Element | null = null
  private sendButton: Element | null = null
  private observer: MutationObserver | null = null
  private sendCallbacks: (() => void)[] = []

  /**
   * 複数のセレクタから要素を検索
   */
  private findElement(selectors: string[]): Element | null {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector)
        if (element && this.isElementVisible(element)) {
          return element
        }
      } catch (error) {
        console.debug(`Selector failed: ${selector}`, error)
      }
    }
    return null
  }

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
   * DOM要素の準備を待機
   */
  async waitForElements(): Promise<void> {
    const maxRetries = 50 // 5秒間待機
    const retryDelay = 100

    for (let i = 0; i < maxRetries; i++) {
      this.textInput = this.findElement(CHATGPT_SELECTORS.textInput)
      this.sendButton = this.findElement(CHATGPT_SELECTORS.sendButton)

      if (this.textInput) {
        console.debug("ChatGPT input field found")
        return
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }

    console.warn("ChatGPT elements not found after waiting")
  }

  /**
   * テキスト入力要素取得
   */
  getTextInput(): Element | null {
    if (!this.textInput) {
      this.textInput = this.findElement(CHATGPT_SELECTORS.textInput)
    }
    return this.textInput
  }

  /**
   * 送信ボタン要素取得
   */
  getSendButton(): Element | null {
    if (!this.sendButton) {
      this.sendButton = this.findElement(CHATGPT_SELECTORS.sendButton)
    }
    return this.sendButton
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners(): void {
    console.debug("Setting up event listeners")
    // 送信ボタンクリック監視
    if (this.sendButton) {
      this.sendButton.addEventListener("click", this.handleSendClick.bind(this))
    }

    // Enterキー監視（テキストエリア内）
    if (this.textInput) {
      this.textInput.addEventListener(
        "keydown",
        this.handleKeyDown.bind(this) as EventListener,
      )
    }

    // フォーム送信監視
    const form = this.textInput?.closest("form")
    if (form) {
      form.addEventListener("submit", this.handleFormSubmit.bind(this))
    }
  }

  /**
   * DOM変更監視設定
   */
  setupDOMObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldRefreshElements = false

      for (const mutation of mutations) {
        // 新しいノードが追加された場合
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldRefreshElements = true
          break
        }

        // 属性が変更された場合
        if (mutation.type === "attributes") {
          const target = mutation.target as Element
          if (target === this.textInput || target === this.sendButton) {
            shouldRefreshElements = true
            break
          }
        }
      }

      if (shouldRefreshElements) {
        this.refreshElements()
      }
    })

    // 監視開始
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "disabled"],
    })
  }

  /**
   * 要素参照の更新
   */
  private refreshElements(): void {
    const newTextInput = this.findElement(CHATGPT_SELECTORS.textInput)
    const newSendButton = this.findElement(CHATGPT_SELECTORS.sendButton)

    // 要素が変更された場合、イベントリスナーを再設定
    if (newTextInput !== this.textInput || newSendButton !== this.sendButton) {
      this.textInput = newTextInput
      this.sendButton = newSendButton

      // 既存のイベントリスナーは自動的に解除される
      this.setupEventListeners()
    }
  }

  /**
   * 送信イベント監視設定
   */
  onSend(callback: () => void): void {
    this.sendCallbacks.push(callback)
  }

  /**
   * 送信イベント監視解除
   */
  offSend(callback: () => void): void {
    const index = this.sendCallbacks.indexOf(callback)
    if (index > -1) {
      this.sendCallbacks.splice(index, 1)
    }
  }

  /**
   * 送信ボタンクリック処理
   */
  private handleSendClick(_event: Event): void {
    this.fireSendCallbacks()
  }

  /**
   * キーダウン処理
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ctrl+Enter または Cmd+Enter で送信
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      this.fireSendCallbacks()
    }
  }

  /**
   * フォーム送信処理
   */
  private handleFormSubmit(_event: Event): void {
    this.fireSendCallbacks()
  }

  /**
   * 送信コールバック実行
   */
  private fireSendCallbacks(): void {
    console.debug("Firing send callbacks")
    this.sendCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Send callback error:", error)
      }
    })
  }

  /**
   * 終了処理
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    this.sendCallbacks = []
    this.textInput = null
    this.sendButton = null
  }
}
