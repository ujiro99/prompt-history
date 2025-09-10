import { sleep } from "../lib/utils"

export const isInputOrTextarea = (
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement => {
  if (target == null) return false
  if (target instanceof HTMLInputElement) {
    return [
      "text",
      "url",
      "number",
      "search",
      "date",
      "datetime-local",
      "month",
      "week",
      "time",
    ].includes(target.type)
  }
  if (target instanceof HTMLTextAreaElement) {
    return true
  }
  return false
}

/**
 * check if the node is a HtmlElment.
 * @param {Node} node The node to check.
 * @returns {boolean} True if the node is a document node.
 */
export const isHtmlElement = (node: unknown): node is HTMLElement => {
  return node instanceof HTMLElement
}

/**
 * check if the node is a text node.
 * @param {Node} node The node to check.
 * @returns {boolean} True if the node is a text node.
 */
export const isTextNode = (node: unknown): node is Text => {
  if (node == null) return false
  if (!(node instanceof Node)) return false
  return node.nodeType === Node.TEXT_NODE
}

export const isInput = (e: unknown): e is HTMLInputElement => {
  return e instanceof HTMLInputElement
}

export const isTextarea = (e: unknown): e is HTMLTextAreaElement => {
  return e instanceof HTMLTextAreaElement
}

export const isEditable = (e: unknown): boolean => {
  if (!(e instanceof HTMLElement)) return false
  return e?.isContentEditable
}

/**
 * Get the focus node of the event.
 * @param {Event} e The event to get the focus node.
 * @returns {HTMLElement | null} The focus node.
 */
export const getFocusNode = (e: Event): HTMLElement | null => {
  const s = window.getSelection()
  if (isInputOrTextarea(e.target)) {
    return e.target
  } else if (isHtmlElement(s?.focusNode)) {
    return s.focusNode
  } else if (
    isTextNode(s?.focusNode) &&
    isHtmlElement(s.focusNode.parentNode)
  ) {
    return s.focusNode.parentNode
  } else if (isHtmlElement(e.target)) {
    return e.target
  }
  return null
}

/**
 * Input text into a contenteditable element, simulating typing with delays.
 *
 * @param {HTMLElement} el The contenteditable element to input text into.
 * @param {string} value The text to input, with '\n' for line breaks.
 * @param {number} interval The delay in milliseconds between line breaks.
 *
 * @return {Promise<boolean>} True if input was successful, false if the element is not editable.
 * */
export async function inputContentEditable(
  el: HTMLElement,
  value: string,
  interval: number,
): Promise<boolean> {
  if (!isEditable(el)) return false
  el.focus()
  const values = value.split("\n")
  for (const [idx, val] of values.entries()) {
    document.execCommand("insertText", false, val)
    if (idx < values.length - 1) {
      await sleep(interval / 2)
      await typeShiftEnter(el)
      await sleep(interval / 2)
    }
  }
  return true
}

/**
 * Simulate typing Shift+Enter key event on an element.
 */
async function typeShiftEnter(el: Element): Promise<void> {
  const down = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    shiftKey: true,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(down)
}

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
