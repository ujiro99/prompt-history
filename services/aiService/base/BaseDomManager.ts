import type {
  AIServiceConfig,
  SendCallback,
  ContentChangeCallback,
  ElementChangeCallback,
  ServiceElementInfo,
} from "./types"

/**
 * Base class for DOM management across AI services
 * Provides common functionality for element detection, event handling, and lifecycle management
 */
export class BaseDomManager {
  protected textInput: Element | null = null
  protected sendButton: Element | null = null
  protected lastContent: string = ""
  protected observer: MutationObserver | null = null

  protected sendCallbacks: Set<SendCallback> = new Set()
  protected contentChangeCallbacks: Set<ContentChangeCallback> = new Set()
  protected elementChangeCallbacks: Set<ElementChangeCallback> = new Set()

  protected contentChangeDebounceTimeout: ReturnType<typeof setTimeout> | null =
    null

  constructor(protected config: AIServiceConfig) {}

  /**
   * Find element using selector list
   */
  protected findElement(selectors: string[]): Element | null {
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
  protected isElementVisible(element: Element): boolean {
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
      this.textInput = this.findElement(this.config.selectors.textInput)
      this.sendButton = this.findElement(this.config.selectors.sendButton)

      if (this.textInput && this.sendButton) {
        console.log(`${this.config.serviceName} elements found:`, {
          textInput: this.textInput,
          sendButton: this.sendButton,
        })
        return
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    throw new Error(`Failed to find ${this.config.serviceName} elements`)
  }

  /**
   * Get text input element
   */
  getTextInput(): Element | null {
    if (!this.textInput) {
      this.textInput = this.findElement(this.config.selectors.textInput)
    }
    return this.textInput
  }

  /**
   * Get current content from text input
   */
  getCurrentContent(): string {
    const input = this.getTextInput()
    if (!input) {
      return ""
    }
    return this.config.extractContent(input)
  }

  /**
   * Get send button element
   */
  getSendButton(): Element | null {
    if (!this.sendButton) {
      this.sendButton = this.findElement(this.config.selectors.sendButton)
    }
    return this.sendButton
  }

  /**
   * Set up send event listeners
   */
  setupSendEventListeners(): void {
    if (!this.textInput || !this.sendButton) {
      console.warn(
        `Cannot setup send listeners: ${this.config.serviceName} elements not found`,
      )
      return
    }

    // Listen for send button click
    this.sendButton.addEventListener("click", this.handleSendClick)

    // Listen for keyboard events in text input
    this.textInput.addEventListener("keydown", this.handleKeyDown)

    // Listen for form submit if inside a form
    const form = this.textInput.closest("form")
    if (form) {
      form.addEventListener("submit", this.handleFormSubmit)
    }

    console.log(`${this.config.serviceName} send event listeners set up`)
  }

  /**
   * Set up content change listeners
   */
  setupContentChangeListeners(): void {
    if (!this.textInput) {
      console.warn(
        `Cannot setup content listeners: ${this.config.serviceName} text input not found`,
      )
      return
    }

    // Set up common input event listeners
    const events = ["input", "paste", "cut", "compositionend"]

    // For contenteditable elements, also listen to keyup
    if (this.textInput.hasAttribute("contenteditable")) {
      events.push("keyup")
    } else {
      events.push("change")
    }

    events.forEach((eventType) => {
      this.textInput!.addEventListener(eventType, this.handleContentChange)
    })

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

    console.log(`${this.config.serviceName} content change listeners set up`)
  }

  /**
   * Set up DOM observer for element changes
   */
  setupDOMObserver(): void {
    this.observer = new MutationObserver(() => {
      // Check if elements still exist and are valid
      const newTextInput = this.findElement(this.config.selectors.textInput)
      const newSendButton = this.findElement(this.config.selectors.sendButton)

      let changed = false

      if (newTextInput !== this.textInput) {
        console.log(`${this.config.serviceName} text input element changed`)
        this.textInput = newTextInput
        changed = true

        // Re-setup listeners for new element
        if (newTextInput) {
          this.setupContentChangeListeners()
          this.setupSendEventListeners()
        }
      }

      if (newSendButton !== this.sendButton) {
        console.log(`${this.config.serviceName} send button element changed`)
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
      attributes: true,
      attributeFilter: ["class", "style", "disabled"],
    })

    console.log(`${this.config.serviceName} DOM observer set up`)
  }

  /**
   * Refresh element references and re-setup listeners
   */
  protected refreshElements(): void {
    const oldTextInput = this.textInput
    const oldSendButton = this.sendButton

    this.textInput = this.findElement(this.config.selectors.textInput)
    this.sendButton = this.findElement(this.config.selectors.sendButton)

    if (this.textInput !== oldTextInput || this.sendButton !== oldSendButton) {
      console.log(`${this.config.serviceName} elements refreshed:`, {
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
  onSend(callback: SendCallback): () => void {
    this.sendCallbacks.add(callback)
    return () => this.offSend(callback)
  }

  /**
   * Unregister send event callback
   */
  offSend(callback: SendCallback): void {
    this.sendCallbacks.delete(callback)
  }

  /**
   * Register content change callback
   */
  onContentChange(callback: ContentChangeCallback): () => void {
    this.contentChangeCallbacks.add(callback)
    return () => this.offContentChange(callback)
  }

  /**
   * Unregister content change callback
   */
  offContentChange(callback: ContentChangeCallback): void {
    this.contentChangeCallbacks.delete(callback)
  }

  /**
   * Register element change callback
   */
  onElementChange(callback: ElementChangeCallback): () => void {
    this.elementChangeCallbacks.add(callback)
    return () => this.offElementChange(callback)
  }

  /**
   * Unregister element change callback
   */
  offElementChange(callback: ElementChangeCallback): void {
    this.elementChangeCallbacks.delete(callback)
  }

  /**
   * Get information about currently detected elements
   */
  getElementInfo(): ServiceElementInfo {
    const textInputInfo = this.findElementInfo(this.config.selectors.textInput)
    const sendButtonInfo = this.findElementInfo(
      this.config.selectors.sendButton,
    )

    return {
      textInput: textInputInfo,
      sendButton: sendButtonInfo,
    }
  }

  /**
   * Find element and return info
   */
  protected findElementInfo(selectors: string[]) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector)
        if (element && this.isElementVisible(element)) {
          return {
            found: true,
            selector,
            tagName: element.tagName,
          }
        }
      } catch {
        // Invalid selector, skip
      }
    }

    return { found: false }
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

      const events = [
        "input",
        "paste",
        "cut",
        "compositionend",
        "keyup",
        "change",
      ]
      events.forEach((eventType) => {
        this.textInput!.removeEventListener(eventType, this.handleContentChange)
      })

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

    console.log(`${this.config.serviceName} DOM manager destroyed`)
  }

  // Event handlers (using arrow functions to preserve 'this' context)

  /**
   * Handle send button click
   */
  protected handleSendClick = (): void => {
    this.fireSendCallbacks()
  }

  /**
   * Handle keyboard events
   */
  protected handleKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent
    if (this.config.keyHandlers.shouldTriggerSend(keyEvent)) {
      // Allow some time for the content to be processed
      setTimeout(() => this.fireSendCallbacks(), 50)
    }
  }

  /**
   * Handle form submit
   */
  protected handleFormSubmit = (): void => {
    this.fireSendCallbacks()
  }

  /**
   * Handle content change events
   */
  protected handleContentChange = (): void => {
    // Clear existing timeout
    if (this.contentChangeDebounceTimeout) {
      clearTimeout(this.contentChangeDebounceTimeout)
    }

    // Debounce content change notifications
    this.contentChangeDebounceTimeout = setTimeout(() => {
      this.checkAndFireContentChange()
    }, this.config.debounceTime)
  }

  /**
   * Check and fire content change callbacks if content changed
   */
  protected checkAndFireContentChange(): void {
    const currentContent = this.getCurrentContent()

    if (currentContent !== this.lastContent) {
      this.lastContent = currentContent
      this.fireContentChangeCallbacks(currentContent)
    }
  }

  /**
   * Fire all content change callbacks
   */
  protected fireContentChangeCallbacks(content: string): void {
    this.contentChangeCallbacks.forEach((callback) => {
      try {
        callback(content)
      } catch (error) {
        console.error("Error in content change callback:", error)
      }
    })

    console.debug(`${this.config.serviceName} content changed:`, {
      length: content.length,
      preview: content.substring(0, 50),
    })
  }

  /**
   * Fire all element change callbacks
   */
  protected fireElementChangeCallbacks(element: Element | null): void {
    this.elementChangeCallbacks.forEach((callback) => {
      try {
        callback(element)
      } catch (error) {
        console.error("Error in element change callback:", error)
      }
    })
  }

  /**
   * Fire all send callbacks
   */
  protected fireSendCallbacks(): void {
    this.sendCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Error in send callback:", error)
      }
    })

    console.debug(`${this.config.serviceName} send event fired`)
  }
}
