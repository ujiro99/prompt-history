import { DomManager } from "./domManager"

/**
 * Class responsible for prompt extraction and injection
 */
export class PromptManager {
  constructor(private domManager: DomManager) {}

  /**
   * Extract prompt content
   */
  extractContent(): string {
    const input = this.domManager.getTextInput()
    if (!input) {
      console.warn("ChatGPT text input not found")
      return ""
    }

    // For contenteditable div
    if (input.getAttribute("contenteditable") === "true") {
      const element = input as HTMLElement
      // Remove HTML tags and get plain text
      return element.innerText || element.textContent || ""
    }

    // For textarea
    if (input.tagName.toLowerCase() === "textarea") {
      return (input as HTMLTextAreaElement).value || ""
    }

    // For input
    if (input.tagName.toLowerCase() === "input") {
      return (input as HTMLInputElement).value || ""
    }

    // Fallback
    const element = input as HTMLElement
    return element.textContent || element.innerText || ""
  }

  /**
   * Inject prompt content
   */
  injectContent(content: string): void {
    const input = this.domManager.getTextInput()
    if (!input) {
      console.warn("ChatGPT text input not found")
      return
    }

    try {
      // For contenteditable div
      if (input.getAttribute("contenteditable") === "true") {
        const element = input as HTMLElement

        // Set focus
        element.focus()

        // Clear existing content
        element.innerHTML = ""
        element.textContent = content

        // Trigger input events
        this.triggerInputEvents(element)

        // Move cursor to end
        this.setCursorToEnd(element)
        return
      }

      // For textarea or input
      if (
        input.tagName.toLowerCase() === "textarea" ||
        input.tagName.toLowerCase() === "input"
      ) {
        const inputElement = input as HTMLTextAreaElement | HTMLInputElement

        // Set focus
        inputElement.focus()

        // Set value
        inputElement.value = content

        // Trigger input events
        this.triggerInputEvents(inputElement)

        // Move cursor to end
        inputElement.selectionStart = inputElement.selectionEnd = content.length
        return
      }

      console.warn("Unsupported input element type")
    } catch (error) {
      console.error("Failed to inject prompt content:", error)
    }
  }

  /**
   * Trigger input events
   */
  private triggerInputEvents(element: Element): void {
    // input event
    element.dispatchEvent(
      new Event("input", { bubbles: true, cancelable: true }),
    )

    // change event
    element.dispatchEvent(
      new Event("change", { bubbles: true, cancelable: true }),
    )

    // compositionupdate event (IME support)
    element.dispatchEvent(
      new CompositionEvent("compositionupdate", { bubbles: true, data: "" }),
    )

    // More detailed InputEvent for React/Vue compatibility
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
   * Move cursor to end of contenteditable element
   */
  private setCursorToEnd(element: HTMLElement): void {
    if (window.getSelection && document.createRange) {
      const selection = window.getSelection()
      const range = document.createRange()

      if (element.childNodes.length > 0) {
        range.selectNodeContents(element)
        range.collapse(false) // Move to end
      } else {
        range.setStart(element, 0)
        range.setEnd(element, 0)
      }

      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }
}
