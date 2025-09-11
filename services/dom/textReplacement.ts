import { extractElementContent } from "../dom"
import type { AutoCompleteMatch } from "../autoComplete/types"

/**
 * Replace text at caret position with selected match
 */
export const replaceTextAtCaret = (
  element: Element,
  match: AutoCompleteMatch,
): void => {
  if (!element) return

  const currentContent = extractElementContent(element)
  const newContent =
    currentContent.substring(0, match.matchStart) +
    match.content +
    currentContent.substring(match.matchEnd)

  // Set new content based on element type
  if (element.tagName.toLowerCase() === "textarea") {
    ;(element as HTMLTextAreaElement).value = newContent
    ;(element as HTMLTextAreaElement).selectionStart = (
      element as HTMLTextAreaElement
    ).selectionEnd = match.matchStart + match.content.length
  } else if (element.tagName.toLowerCase() === "input") {
    ;(element as HTMLInputElement).value = newContent
    ;(element as HTMLInputElement).selectionStart = (
      element as HTMLInputElement
    ).selectionEnd = match.matchStart + match.content.length
  } else if (element.getAttribute("contenteditable") === "true") {
    // For contenteditable elements, we need to handle text replacement differently
    const htmlElement = element as HTMLElement
    htmlElement.textContent = newContent

    // Set cursor position
    if (window.getSelection && document.createRange) {
      const selection = window.getSelection()
      const range = document.createRange()
      const textNode = htmlElement.firstChild

      if (textNode) {
        const newCaretPos = match.matchStart + match.content.length
        range.setStart(
          textNode,
          Math.min(newCaretPos, textNode.textContent?.length || 0),
        )
        range.setEnd(
          textNode,
          Math.min(newCaretPos, textNode.textContent?.length || 0),
        )
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }

  // Trigger input event to notify other listeners
  const inputEvent = new Event("input", { bubbles: true })
  element.dispatchEvent(inputEvent)
}
