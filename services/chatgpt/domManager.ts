import { CHATGPT_SELECTORS } from "./chatGptSelectors"
import { extractElementContent } from "../dom"

/**
 * Class responsible for DOM element management and event handling
 */
export class DomManager {
  private textInput: Element | null = null
  private sendButton: Element | null = null
  private lastContent: string = ""
  private observer: MutationObserver | null = null
  private sendCallbacks: (() => void)[] = []
  private contentChangeCallbacks: ((content: string) => void)[] = []
  private contentChangeDebounceTimeout: number | null = null
  private elementChangeCallbacks: ((textInput: Element | null) => void)[] = []

  /**
   * Find element from multiple selectors
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
   * Check element visibility
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
   * Wait for DOM elements to be ready
   */
  async waitForElements(): Promise<void> {
    const maxRetries = 50 // 5 seconds max
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
   * Get text input element
   */
  getTextInput(): Element | null {
    if (!this.textInput) {
      this.textInput = this.findElement(CHATGPT_SELECTORS.textInput)
    }
    return this.textInput
  }

  /**
   * Get current content from input element
   */
  getCurrentContent(): string {
    const input = this.getTextInput()
    if (!input) {
      return ""
    }
    return extractElementContent(input)
  }

  /**
   * Get send button element
   */
  getSendButton(): Element | null {
    if (!this.sendButton) {
      this.sendButton = this.findElement(CHATGPT_SELECTORS.sendButton)
    }
    return this.sendButton
  }

  /**
   * Set up event listeners
   */
  setupSendEventListeners(): void {
    console.debug("Setting up send event listeners")
    // Monitor send button click
    if (this.sendButton) {
      this.sendButton.addEventListener("click", this.handleSendClick.bind(this))
    }

    // Monitor Enter key (within text area)
    if (this.textInput) {
      this.textInput.addEventListener(
        "keydown",
        this.handleKeyDown.bind(this) as EventListener,
      )
    }

    // Monitor form submission
    const form = this.textInput?.closest("form")
    if (form) {
      form.addEventListener("submit", this.handleFormSubmit.bind(this))
    }
  }

  /**
   * Set up content change event listeners
   */
  setupContentChangeListeners(): void {
    console.debug("Setting up content change listeners")

    if (this.textInput) {
      // Monitor input changes
      this.textInput.addEventListener(
        "input",
        this.handleContentChange.bind(this) as EventListener,
      )

      // Monitor IME composition end
      this.textInput.addEventListener(
        "compositionend",
        this.handleContentChange.bind(this) as EventListener,
      )

      // Monitor paste operations
      this.textInput.addEventListener(
        "paste",
        this.handleContentChange.bind(this) as EventListener,
      )

      // Monitor cut operations
      this.textInput.addEventListener(
        "cut",
        this.handleContentChange.bind(this) as EventListener,
      )
    }
  }

  /**
   * Handle content change with debouncing
   */
  private handleContentChange(_event: Event): void {
    // Clear existing timeout
    if (this.contentChangeDebounceTimeout !== null) {
      clearTimeout(this.contentChangeDebounceTimeout)
    }

    // Set new timeout for debouncing
    this.contentChangeDebounceTimeout = setTimeout(() => {
      this.checkAndFireContentChange()
      this.contentChangeDebounceTimeout = null
    }, 200) as unknown as number
  }

  /**
   * Check for content changes and fire callbacks if changed
   */
  private checkAndFireContentChange(): void {
    const currentContent = this.getCurrentContent()

    // Only fire if content actually changed
    if (currentContent !== this.lastContent) {
      this.lastContent = currentContent
      this.fireContentChangeCallbacks(currentContent)
    }
  }

  /**
   * Execute content change callbacks
   */
  private fireContentChangeCallbacks(content: string): void {
    console.debug(
      "Firing content change callbacks, content length:",
      content.length,
    )
    this.contentChangeCallbacks.forEach((callback) => {
      try {
        callback(content)
      } catch (error) {
        console.error("Content change callback error:", error)
      }
    })
  }

  /**
   * Set up DOM change monitoring
   */
  setupDOMObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldRefreshElements = false

      for (const mutation of mutations) {
        // When new nodes are added
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldRefreshElements = true
          break
        }

        // When attributes are changed
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

    // Start monitoring
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "disabled"],
    })
  }

  /**
   * Update element references
   */
  private refreshElements(): void {
    const newTextInput = this.findElement(CHATGPT_SELECTORS.textInput)
    const newSendButton = this.findElement(CHATGPT_SELECTORS.sendButton)

    // Re-set event listeners when elements change
    if (newTextInput !== this.textInput || newSendButton !== this.sendButton) {
      this.textInput = newTextInput
      this.sendButton = newSendButton

      // Notify element change callbacks
      this.fireElementChangeCallbacks(this.textInput)

      // Existing event listeners are automatically removed
      this.setupSendEventListeners()
      this.setupContentChangeListeners()
    }
  }

  /**
   * Set up send event monitoring
   */
  onSend(callback: () => void): () => void {
    this.sendCallbacks.push(callback)
    return () => {
      this.offSend(callback)
    }
  }

  /**
   * Remove send event monitoring
   */
  offSend(callback: () => void): void {
    const index = this.sendCallbacks.indexOf(callback)
    if (index > -1) {
      this.sendCallbacks.splice(index, 1)
    }
  }

  /**
   * Set up content change monitoring
   */
  onContentChange(callback: (content: string) => void): () => void {
    this.contentChangeCallbacks.push(callback)
    return () => {
      this.offContentChange(callback)
    }
  }

  /**
   * Remove content change monitoring
   */
  offContentChange(callback: (content: string) => void): void {
    const index = this.contentChangeCallbacks.indexOf(callback)
    if (index > -1) {
      this.contentChangeCallbacks.splice(index, 1)
    }
  }

  /**
   * Set up element change monitoring
   */
  onElementChange(callback: (textInput: Element | null) => void): () => void {
    this.elementChangeCallbacks.push(callback)
    return () => {
      this.offElementChange(callback)
    }
  }

  /**
   * Remove element change monitoring
   */
  offElementChange(callback: (textInput: Element | null) => void): void {
    const index = this.elementChangeCallbacks.indexOf(callback)
    if (index > -1) {
      this.elementChangeCallbacks.splice(index, 1)
    }
  }

  /**
   * Execute element change callbacks
   */
  private fireElementChangeCallbacks(textInput: Element | null): void {
    this.elementChangeCallbacks.forEach((callback) => {
      try {
        callback(textInput)
      } catch (error) {
        console.error("Element change callback error:", error)
      }
    })
  }

  /**
   * Handle send button click
   */
  private handleSendClick(_event: Event): void {
    this.fireSendCallbacks()
  }

  /**
   * Handle key down
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Send with Ctrl+Enter or Cmd+Enter, but not during IME composition
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey) &&
      !event.isComposing
    ) {
      this.fireSendCallbacks()
    }
  }

  /**
   * Handle form submission
   */
  private handleFormSubmit(_event: Event): void {
    this.fireSendCallbacks()
  }

  /**
   * Execute send callbacks
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
   * Cleanup
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    // Clear debounce timeout
    if (this.contentChangeDebounceTimeout !== null) {
      clearTimeout(this.contentChangeDebounceTimeout)
      this.contentChangeDebounceTimeout = null
    }

    this.sendCallbacks = []
    this.contentChangeCallbacks = []
    this.elementChangeCallbacks = []
    this.lastContent = ""
    this.textInput = null
    this.sendButton = null
  }
}
