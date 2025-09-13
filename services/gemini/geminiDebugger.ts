import { GEMINI_SELECTORS } from "./geminiSelectors"

/**
 * Debugging utilities for Google Gemini service
 */
export class GeminiDebugger {
  /**
   * Test all selectors and report results
   */
  testSelectors(): void {
    console.group("🔍 Gemini Selector Test Results")

    // Test text input selectors
    console.group("Text Input Selectors:")
    this.testSelectorGroup(GEMINI_SELECTORS.textInput, "Text Input")
    console.groupEnd()

    // Test send button selectors
    console.group("Send Button Selectors:")
    this.testSelectorGroup(GEMINI_SELECTORS.sendButton, "Send Button")
    console.groupEnd()

    // Test chat history selectors
    console.group("Chat History Selectors:")
    this.testSelectorGroup(GEMINI_SELECTORS.chatHistory, "Chat History")
    console.groupEnd()

    console.groupEnd()
  }

  /**
   * Test a group of selectors
   */
  private testSelectorGroup(selectors: string[], groupName: string): void {
    let foundElement: Element | null = null

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector)
        if (element) {
          const isVisible = this.isElementVisible(element)
          if (isVisible && !foundElement) {
            foundElement = element
            console.log(`✅ ${selector}`, {
              element,
              tagName: element.tagName,
              className: element.className,
              id: element.id,
            })
          } else if (isVisible) {
            console.log(`⚠️ ${selector} (duplicate match)`, element)
          } else {
            console.log(`🫥 ${selector} (hidden)`, element)
          }
        } else {
          console.log(`❌ ${selector}`)
        }
      } catch (_error) {
        console.error(`🚫 ${selector} (invalid selector)`, _error)
      }
    }

    if (foundElement) {
      console.log(`✨ Found ${groupName}:`, foundElement)
    } else {
      console.warn(`⚠️ No ${groupName} found`)
    }
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
   * Get detailed information about detected elements
   */
  getElementInfo(): {
    textInput: { found: boolean; selector?: string; tagName?: string }
    sendButton: { found: boolean; selector?: string; tagName?: string }
  } {
    const textInputInfo = this.findElementInfo(GEMINI_SELECTORS.textInput)
    const sendButtonInfo = this.findElementInfo(GEMINI_SELECTORS.sendButton)

    return {
      textInput: textInputInfo,
      sendButton: sendButtonInfo,
    }
  }

  /**
   * Find element and return info
   */
  private findElementInfo(selectors: string[]): {
    found: boolean
    selector?: string
    tagName?: string
  } {
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
      } catch (_error) {
        // Invalid selector, skip
      }
    }

    return { found: false }
  }

  /**
   * Monitor DOM changes for debugging
   */
  monitorDOMChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              this.checkForRelevantElements(node)
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    console.log("🔍 Gemini DOM monitor started")
  }

  /**
   * Check if added element matches our selectors
   */
  private checkForRelevantElements(element: Element): void {
    // Check against text input selectors
    for (const selector of GEMINI_SELECTORS.textInput) {
      try {
        if (element.matches(selector)) {
          console.log("📝 New text input detected:", selector, element)
          break
        }
      } catch {
        // Invalid selector for matches()
      }
    }

    // Check against send button selectors
    for (const selector of GEMINI_SELECTORS.sendButton) {
      try {
        if (element.matches(selector)) {
          console.log("🚀 New send button detected:", selector, element)
          break
        }
      } catch {
        // Invalid selector for matches()
      }
    }
  }

  /**
   * Log current page state for debugging
   */
  logPageState(): void {
    console.group("📊 Gemini Page State")

    console.log("URL:", window.location.href)
    console.log("Title:", document.title)

    const info = this.getElementInfo()
    console.log("Text Input:", info.textInput)
    console.log("Send Button:", info.sendButton)

    // Check for common Gemini elements
    const geminiElements = {
      "Main container": document.querySelector(".main-container"),
      "Input area": document.querySelector(".input-area"),
      Messages: document.querySelectorAll(".message-content").length,
      Conversation: document.querySelector(".conversation"),
    }

    console.table(geminiElements)
    console.groupEnd()
  }
}
