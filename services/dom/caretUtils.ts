/**
 * Caret position utilities
 */
import { isInputOrTextarea, isTextarea, isEditable } from "./elementUtils"

/**
 * Coordinates for caret position
 */
export interface CaretCoordinates {
  x: number
  y: number
  height: number
}

/**
 * Get the visual coordinates of the caret in an element
 */
export function getCaretCoordinates(element: Element): CaretCoordinates | null {
  if (!element) {
    return null
  }

  // For contenteditable elements, use Range API
  if (isEditable(element)) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return null
    }

    const range = selection.getRangeAt(0)
    // Create a zero-width range at the caret position
    const caretRange = range.cloneRange()
    caretRange.collapse(true)

    // Get the bounding rect of the caret position
    const rect = caretRange.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      // Fallback: insert a temporary zero-width space to measure
      const span = document.createElement("span")
      span.textContent = "\u200B" // Zero-width space
      caretRange.insertNode(span)
      const spanRect = span.getBoundingClientRect()
      span.remove()

      return {
        x: spanRect.left,
        y: spanRect.top,
        height: spanRect.height || 20,
      }
    }

    return {
      x: rect.left,
      y: rect.top,
      height: rect.height || 20,
    }
  }

  // For input/textarea elements, use mirror div technique
  if (isInputOrTextarea(element)) {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement
    const caretPos = inputElement.selectionStart || 0

    // Create a mirror div with same styling
    const mirror = document.createElement("div")
    const computed = window.getComputedStyle(inputElement)

    // Copy relevant styles
    const stylesToCopy = [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "letterSpacing",
      "textTransform",
      "wordSpacing",
      "textIndent",
      "whiteSpace",
      "lineHeight",
      "padding",
      "border",
      "boxSizing",
    ]

    stylesToCopy.forEach((style) => {
      const computedValue = computed.getPropertyValue(style)
      mirror.style.setProperty(style, computedValue)
    })

    // Position off-screen
    mirror.style.position = "absolute"
    mirror.style.visibility = "hidden"
    mirror.style.top = "-9999px"
    mirror.style.left = "-9999px"
    mirror.style.width = computed.width
    mirror.style.height = computed.height
    mirror.style.overflow = "hidden"

    // Handle textarea-specific styles
    if (isTextarea(element)) {
      mirror.style.wordWrap = computed.wordWrap || "break-word"
      mirror.style.whiteSpace = "pre-wrap"
    } else {
      mirror.style.whiteSpace = "nowrap"
      mirror.style.overflow = "hidden"
    }

    document.body.appendChild(mirror)

    // Copy text up to caret position
    const textBeforeCaret = inputElement.value.substring(0, caretPos)
    mirror.textContent = textBeforeCaret

    // Add a span at the caret position
    const caretSpan = document.createElement("span")
    caretSpan.textContent = "|"
    mirror.appendChild(caretSpan)

    // Get position of the caret span
    const spanRect = caretSpan.getBoundingClientRect()
    const inputRect = inputElement.getBoundingClientRect()

    // Account for scroll position in the input
    let scrollLeft = 0
    let scrollTop = 0

    if ("scrollLeft" in inputElement) {
      scrollLeft = inputElement.scrollLeft
      scrollTop = inputElement.scrollTop
    }

    // Clean up
    document.body.removeChild(mirror)

    // Calculate final position relative to input element
    const x =
      inputRect.left +
      (spanRect.left - mirror.getBoundingClientRect().left) -
      scrollLeft
    const y =
      inputRect.top +
      (spanRect.top - mirror.getBoundingClientRect().top) -
      scrollTop

    return {
      x: x,
      y: y,
      height:
        parseInt(computed.lineHeight) || parseInt(computed.fontSize) || 20,
    }
  }

  return null
}

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
