/**
 * Caret position utilities
 */
import { isInputOrTextarea } from "./elementUtils"

/**
 * Calculate text length from DOM range using the same algorithm as normalizeHtmlNewlines
 * This ensures consistency with content extraction for position calculations
 */
function getTextLengthFromRange(range: Range): number {
  let result = ""

  function traverse(nodes: Node[]) {
    nodes.forEach((node) => {
      if (node.nodeType === 3) {
        // Text node
        result += node.textContent || ""
      } else if (node.nodeName === "BR") {
        result += "\n"
      } else if (node.nodeName === "DIV" || node.nodeName === "P") {
        if (result && !result.endsWith("\n")) result += "\n"
        traverse(Array.from(node.childNodes))
        if (!result.endsWith("\n")) result += "\n"
      } else {
        traverse(Array.from(node.childNodes))
      }
    })
  }

  // Clone range contents to avoid modifying the original
  const contents = range.cloneContents()
  traverse(Array.from(contents.childNodes))

  // Remove extra newlines at the end (same as normalizeHtmlNewlines)
  const normalizedResult = result.replace(/\n+$/g, "")

  return normalizedResult.length
}

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

    // Use same algorithm as normalizeHtmlNewlines for consistency
    return getTextLengthFromRange(preCaretRange)
  }

  return 0
}
