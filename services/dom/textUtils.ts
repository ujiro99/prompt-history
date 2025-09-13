/**
 * Text extraction and normalization utilities
 */

/**
 * Normalize newlines in an HTML element.
 * - Converts <br>, <div>, and <p> tags to '\n' and preserves text content.
 * - Trims extra newlines at the end.
 *
 * @param {HTMLElement} el The HTML element to normalize.
 * @return {string} The normalized text with '\n' for line breaks.
 *
 */
export function normalizeHtmlNewlines(el: Element): string {
  let result = ""
  function traverse(nodes: Node[]) {
    nodes.forEach((node) => {
      if (node.nodeType === 3) {
        // Text node
        result += node.textContent
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
  traverse(Array.from(el.childNodes))
  // Remove extra newlines at the end
  return result.replace(/\n+$/g, "")
}

/**
 * Extract content from input element
 * @param {Element} element The input element to extract content from
 * @return {string} The extracted content as plain text
 */
export function extractElementContent(element: Element): string {
  if (!element) {
    return ""
  }

  // For contenteditable div
  if (element.getAttribute("contenteditable") === "true") {
    return normalizeHtmlNewlines(element)
  }

  // For textarea
  if (element.tagName.toLowerCase() === "textarea") {
    return (element as HTMLTextAreaElement).value || ""
  }

  // For input
  if (element.tagName.toLowerCase() === "input") {
    return (element as HTMLInputElement).value || ""
  }

  // Fallback
  const htmlElement = element as HTMLElement
  return htmlElement.textContent || htmlElement.innerText || ""
}
