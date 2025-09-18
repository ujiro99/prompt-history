/**
 * Selector debug configuration interface
 */
export interface SelectorDebugConfig {
  serviceName: string
  textInputSelectors: string[]
  sendButtonSelectors: string[]
}

/**
 * Selector debugger for testing AI service DOM selectors
 */
export class SelectorDebugger {
  private config: SelectorDebugConfig

  constructor(config: SelectorDebugConfig) {
    this.config = config
  }

  /**
   * Test all selectors for this service
   */
  testSelectors(): void {
    console.group(`🔍 ${this.config.serviceName} Selector Test Results`)

    // Test text input selectors
    console.group("Text Input Selectors:")
    this.testSelectorGroup(this.config.textInputSelectors, "Text Input")
    console.groupEnd()

    // Test send button selectors
    console.group("Send Button Selectors:")
    this.testSelectorGroup(this.config.sendButtonSelectors, "Send Button")
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
}
