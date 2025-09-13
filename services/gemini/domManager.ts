import { GEMINI_SELECTORS } from "./geminiSelectors"

/**
 * DOM management for Google Gemini
 */
export class DomManager {
  private textInput: Element | null = null
  private sendButton: Element | null = null
  private lastContent: string = ""
  private observer: MutationObserver | null = null
  private sendCallbacks: Set<() => void> = new Set()
  private contentChangeCallbacks: Set<(content: string) => void> = new Set()
  private contentChangeDebounceTimeout: ReturnType<typeof setTimeout> | null =
    null
  private elementChangeCallbacks: Set<(element: Element | null) => void> =
    new Set()

  /**
   * Find element using selector list
   */
  private findElement(selectors: string[]): Element | null {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector)
        if (element && this.isElementVisible(element)) {
          return element
        }
      } catch (error) {
        console.debug(`Invalid selector: ${selector}`, error)
      }
    }
    return null
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    )
  }

  /**
   * Wait for necessary elements to be available
   */
  async waitForElements(): Promise<void> {
    const maxAttempts = 50
    const delayMs = 200

    for (let i = 0; i < maxAttempts; i++) {
      this.textInput = this.findElement(GEMINI_SELECTORS.textInput)
      this.sendButton = this.findElement(GEMINI_SELECTORS.sendButton)

      if (this.textInput && this.sendButton) {
        console.log("Gemini elements found:", {
          textInput: this.textInput,
          sendButton: this.sendButton,
        })
        return
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    throw new Error("Failed to find Gemini elements")
  }

  /**
   * Get text input element
   */
  getTextInput(): Element | null {
    return this.textInput
  }

  /**
   * Get current content from text input
   */
  getCurrentContent(): string {
    if (!this.textInput) return ""

    // Handle contenteditable elements
    if (this.textInput.hasAttribute("contenteditable")) {
      return this.textInput.textContent || ""
    }

    // Handle rich-textarea or regular textarea
    if (
      this.textInput instanceof HTMLTextAreaElement ||
      this.textInput instanceof HTMLInputElement
    ) {
      return this.textInput.value
    }

    // For custom components, try to get text content
    return this.textInput.textContent || ""
  }

  /**
   * Get send button element
   */
  getSendButton(): Element | null {
    return this.sendButton
  }

  /**
   * Set up send event listeners
   */
  setupSendEventListeners(): void {
    if (!this.textInput || !this.sendButton) {
      console.warn("Cannot setup send listeners: elements not found")
      return
    }

    // Listen for send button click
    this.sendButton.addEventListener("click", this.handleSendClick)

    // Listen for Enter key in text input
    this.textInput.addEventListener("keydown", this.handleKeyDown)

    // Listen for form submit if inside a form
    const form = this.textInput.closest("form")
    if (form) {
      form.addEventListener("submit", this.handleFormSubmit)
    }

    console.log("Gemini send event listeners set up")
  }

  /**
   * Set up content change listeners
   */
  setupContentChangeListeners(): void {
    if (!this.textInput) {
      console.warn("Cannot setup content listeners: text input not found")
      return
    }

    // For contenteditable elements
    if (this.textInput.hasAttribute("contenteditable")) {
      this.textInput.addEventListener("input", this.handleContentChange)
      this.textInput.addEventListener("paste", this.handleContentChange)
      this.textInput.addEventListener("cut", this.handleContentChange)
      this.textInput.addEventListener("keyup", this.handleContentChange)
    } else {
      // For regular input/textarea elements
      this.textInput.addEventListener("input", this.handleContentChange)
      this.textInput.addEventListener("change", this.handleContentChange)
      this.textInput.addEventListener("paste", this.handleContentChange)
      this.textInput.addEventListener("cut", this.handleContentChange)
    }

    // Also monitor DOM changes for dynamic content
    const observer = new MutationObserver(() => {
      this.handleContentChange()
    })

    observer.observe(this.textInput, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value"],
    })

    console.log("Gemini content change listeners set up")
  }

  /**
   * Handle content change events
   */
  private handleContentChange = (): void => {
    // Clear existing timeout
    if (this.contentChangeDebounceTimeout) {
      clearTimeout(this.contentChangeDebounceTimeout)
    }

    // Debounce content change notifications
    this.contentChangeDebounceTimeout = setTimeout(() => {
      this.checkAndFireContentChange()
    }, 100)
  }

  /**
   * Check and fire content change callbacks if content changed
   */
  private checkAndFireContentChange(): void {
    const currentContent = this.getCurrentContent()

    if (currentContent !== this.lastContent) {
      this.lastContent = currentContent
      this.fireContentChangeCallbacks(currentContent)
    }
  }

  /**
   * Fire all content change callbacks
   */
  private fireContentChangeCallbacks(content: string): void {
    this.contentChangeCallbacks.forEach((callback) => {
      try {
        callback(content)
      } catch (error) {
        console.error("Error in content change callback:", error)
      }
    })

    console.debug("Gemini content changed:", {
      length: content.length,
      preview: content.substring(0, 50),
    })
  }

  /**
   * Set up DOM observer for element changes
   */
  setupDOMObserver(): void {
    this.observer = new MutationObserver(() => {
      // Check if elements still exist and are valid
      const newTextInput = this.findElement(GEMINI_SELECTORS.textInput)
      const newSendButton = this.findElement(GEMINI_SELECTORS.sendButton)

      let changed = false

      if (newTextInput !== this.textInput) {
        console.log("Gemini text input element changed")
        this.textInput = newTextInput
        changed = true

        // Re-setup listeners for new element
        if (newTextInput) {
          this.setupContentChangeListeners()
          this.setupSendEventListeners()
        }
      }

      if (newSendButton !== this.sendButton) {
        console.log("Gemini send button element changed")
        this.sendButton = newSendButton
        changed = true

        // Re-setup listeners for new element
        if (newSendButton) {
          this.setupSendEventListeners()
        }
      }

      if (changed) {
        this.refreshElements()
      }
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    console.log("Gemini DOM observer set up")
  }

  /**
   * Refresh element references and re-setup listeners
   */
  private refreshElements(): void {
    const oldTextInput = this.textInput
    const oldSendButton = this.sendButton

    this.textInput = this.findElement(GEMINI_SELECTORS.textInput)
    this.sendButton = this.findElement(GEMINI_SELECTORS.sendButton)

    if (this.textInput !== oldTextInput || this.sendButton !== oldSendButton) {
      console.log("Gemini elements refreshed:", {
        textInput: this.textInput,
        sendButton: this.sendButton,
      })

      // Notify element change callbacks
      this.fireElementChangeCallbacks(this.textInput)
    }
  }

  /**
   * Register send event callback
   */
  onSend(callback: () => void): () => void {
    this.sendCallbacks.add(callback)
    return () => this.offSend(callback)
  }

  /**
   * Unregister send event callback
   */
  offSend(callback: () => void): void {
    this.sendCallbacks.delete(callback)
  }

  /**
   * Register content change callback
   */
  onContentChange(callback: (content: string) => void): () => void {
    this.contentChangeCallbacks.add(callback)
    return () => this.offContentChange(callback)
  }

  /**
   * Unregister content change callback
   */
  offContentChange(callback: (content: string) => void): void {
    this.contentChangeCallbacks.delete(callback)
  }

  /**
   * Register element change callback
   */
  onElementChange(callback: (element: Element | null) => void): () => void {
    this.elementChangeCallbacks.add(callback)
    return () => this.offElementChange(callback)
  }

  /**
   * Unregister element change callback
   */
  offElementChange(callback: (element: Element | null) => void): void {
    this.elementChangeCallbacks.delete(callback)
  }

  /**
   * Fire all element change callbacks
   */
  private fireElementChangeCallbacks(element: Element | null): void {
    this.elementChangeCallbacks.forEach((callback) => {
      try {
        callback(element)
      } catch (error) {
        console.error("Error in element change callback:", error)
      }
    })
  }

  /**
   * Handle send button click
   */
  private handleSendClick = (): void => {
    this.fireSendCallbacks()
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent
    if (
      keyEvent.key === "Enter" &&
      !keyEvent.shiftKey &&
      !keyEvent.ctrlKey &&
      !keyEvent.isComposing
    ) {
      // Allow some time for the content to be processed
      setTimeout(() => this.fireSendCallbacks(), 50)
    }
  }

  /**
   * Handle form submit
   */
  private handleFormSubmit = (): void => {
    this.fireSendCallbacks()
  }

  /**
   * Fire all send callbacks
   */
  private fireSendCallbacks(): void {
    this.sendCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Error in send callback:", error)
      }
    })

    console.debug("Gemini send event fired")
  }

  /**
   * Clean up all listeners and observers
   */
  destroy(): void {
    // Remove event listeners
    if (this.sendButton) {
      this.sendButton.removeEventListener("click", this.handleSendClick)
    }

    if (this.textInput) {
      this.textInput.removeEventListener("keydown", this.handleKeyDown)
      this.textInput.removeEventListener("input", this.handleContentChange)
      this.textInput.removeEventListener("change", this.handleContentChange)
      this.textInput.removeEventListener("paste", this.handleContentChange)
      this.textInput.removeEventListener("cut", this.handleContentChange)
      this.textInput.removeEventListener("keyup", this.handleContentChange)

      const form = this.textInput.closest("form")
      if (form) {
        form.removeEventListener("submit", this.handleFormSubmit)
      }
    }

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    // Clear timeouts
    if (this.contentChangeDebounceTimeout) {
      clearTimeout(this.contentChangeDebounceTimeout)
      this.contentChangeDebounceTimeout = null
    }

    // Clear callbacks
    this.sendCallbacks.clear()
    this.contentChangeCallbacks.clear()
    this.elementChangeCallbacks.clear()

    console.log("Gemini DOM manager destroyed")
  }
}
