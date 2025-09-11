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

/**
 * Find the appropriate text node and offset for a given position in contenteditable element
 * This mirrors the logic of getTextLengthFromRange in reverse
 */
function findNodeAndOffsetForPosition(
  element: Element,
  targetPosition: number,
): { node: Node; offset: number } | null {
  let currentPosition = 0
  let lastTextNode: Node | null = null
  let hasContent = false

  function traverse(nodes: Node[]): { node: Node; offset: number } | null {
    for (const node of nodes) {
      if (node.nodeType === 3) {
        // Text node
        const textContent = node.textContent || ""
        const textLength = textContent.length
        lastTextNode = node

        if (currentPosition + textLength >= targetPosition) {
          return { node, offset: targetPosition - currentPosition }
        }
        currentPosition += textLength
        hasContent = true
      } else if (node.nodeName === "BR") {
        if (currentPosition >= targetPosition) {
          // Return position before the BR element
          return lastTextNode
            ? {
                node: lastTextNode,
                offset: (lastTextNode as Text).textContent?.length || 0,
              }
            : { node: node.parentNode || element, offset: 0 }
        }
        currentPosition += 1
        hasContent = true
      } else if (node.nodeName === "DIV" || node.nodeName === "P") {
        // Add newline before DIV/P if there's already content (matches "if (result && !result.endsWith("\n"))")
        if (hasContent) {
          if (currentPosition >= targetPosition) {
            return lastTextNode
              ? {
                  node: lastTextNode,
                  offset: (lastTextNode as Text).textContent?.length || 0,
                }
              : { node: element, offset: 0 }
          }
          currentPosition += 1
        }

        const childResult = traverse(Array.from(node.childNodes))
        if (childResult) return childResult

        // Add newline after DIV/P (matches "if (!result.endsWith("\n"))")
        // Only add if we haven't just added content that would end with newline
        if (currentPosition >= targetPosition) {
          return lastTextNode
            ? {
                node: lastTextNode,
                offset: (lastTextNode as Text).textContent?.length || 0,
              }
            : { node: element, offset: 0 }
        }
        currentPosition += 1
        hasContent = true
      } else {
        const result = traverse(Array.from(node.childNodes))
        if (result) return result
      }

      if (currentPosition >= targetPosition) {
        break
      }
    }
    return null
  }

  const result = traverse(Array.from(element.childNodes))

  // If we couldn't find the exact position, return the last available text position
  if (!result) {
    // Type assertion to help TypeScript understand the type
    const textNode = lastTextNode as Node | null
    if (textNode && textNode.nodeType === 3) {
      return {
        node: textNode,
        offset: (textNode as Text).textContent?.length || 0,
      }
    } else if (element.childNodes.length > 0) {
      // No text node found, try to place at the end of the element
      const lastChild = element.childNodes[element.childNodes.length - 1]
      if (lastChild.nodeType === 3) {
        return {
          node: lastChild,
          offset: (lastChild as Text).textContent?.length || 0,
        }
      } else {
        return { node: element, offset: element.childNodes.length }
      }
    }
  }

  return result
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

      // Use the new logic to find the correct node and offset
      const nodeAndOffset = findNodeAndOffsetForPosition(element, position)

      if (nodeAndOffset) {
        range.setStart(nodeAndOffset.node, nodeAndOffset.offset)
        range.setEnd(nodeAndOffset.node, nodeAndOffset.offset)
        selection?.removeAllRanges()
        selection?.addRange(range)
      } else {
        // Fallback: if we can't find a suitable position, try the old logic
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
}
