/**
 * Caret position utilities
 */
import { isInputOrTextarea } from "./elementUtils"

/**
 * Get caret position in text input or contenteditable element
 */
export function getCaretPosition(element: Element): number {
  if (!element) {
    return 0
  }

  // For textarea and input elements
  if (isInputOrTextarea(element)) {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement
    return inputElement.selectionStart || 0
  }

  // For contenteditable elements
  if (element.getAttribute("contenteditable") === "true") {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return 0
    }

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(element)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    return preCaretRange.toString().length
  }

  return 0
}

/**
 * Set caret position in text input or contenteditable element
 */
export function setCaretPosition(element: Element, position: number): void {
  if (!element) return

  // For textarea and input elements
  if (isInputOrTextarea(element)) {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement
    inputElement.selectionStart = position
    inputElement.selectionEnd = position
    return
  }

  // For contenteditable elements
  if (element.getAttribute("contenteditable") === "true") {
    if (window.getSelection && document.createRange) {
      const selection = window.getSelection()
      const range = document.createRange()
      const textNode = element.firstChild

      if (textNode) {
        const safePosition = Math.min(
          position,
          textNode.textContent?.length || 0,
        )
        range.setStart(textNode, safePosition)
        range.setEnd(textNode, safePosition)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }
}
