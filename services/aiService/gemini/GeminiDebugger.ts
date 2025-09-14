import { GEMINI_DEFINITIONS as DEFINITIONS } from "./geminiDefinitions"

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
    this.testSelectorGroup(DEFINITIONS.selectors.textInput, "Text Input")
    console.groupEnd()

    // Test send button selectors
    console.group("Send Button Selectors:")
    this.testSelectorGroup(DEFINITIONS.selectors.sendButton, "Send Button")
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
   * Log current page state for debugging
   */
  logPageState(): void {
    console.group("📊 Gemini Page State")

    console.log("URL:", window.location.href)
    console.log("Title:", document.title)

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
