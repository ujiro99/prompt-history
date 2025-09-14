import { CHATGPT_SELECTORS } from "./chatGptSelectors"

/**
 * Debugging utilities for ChatGPT service
 */
export class ChatGptDebugger {
  /**
   * Test all selectors and report results
   */
  testSelectors(): void {
    console.group("🔍 ChatGPT Selector Test Results")

    // Test text input selectors
    console.group("Text Input Selectors:")
    this.testSelectorGroup(CHATGPT_SELECTORS.textInput, "Text Input")
    console.groupEnd()

    // Test send button selectors
    console.group("Send Button Selectors:")
    this.testSelectorGroup(CHATGPT_SELECTORS.sendButton, "Send Button")
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
      parseFloat(style.opacity) > 0
    )
  }

  /**
   * Log current page state for debugging
   */
  logPageState(): void {
    console.group("📊 ChatGPT Page State")

    console.log("URL:", window.location.href)
    console.log("Title:", document.title)

    // Check for common ChatGPT elements
    const chatgptElements = {
      "Main container": document.querySelector(".main-container"),
      "Input area": document.querySelector("#prompt-textarea"),
      Messages: document.querySelectorAll('[data-testid="conversation-turn"]')
        .length,
      "Send button": document.querySelector('[data-testid="send-button"]'),
    }

    console.table(chatgptElements)
    console.groupEnd()
  }
}
