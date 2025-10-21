/**
 * Element type checking and utility functions
 */

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
 * Get the next or previous sibling element in a cyclic manner.
 * If there is no next/previous sibling, it wraps around to the first/last child.
 * @param {Element} elem The reference element.
 * @return {Element} The next or previous sibling element cyclically.
 */
export function nextCyclic(elem: Element): Element {
  const parent = elem.parentElement
  if (!parent) return elem
  return (elem.nextElementSibling ?? parent.firstElementChild)!
}

/**
 * Get the previous sibling element in a cyclic manner.
 * If there is no previous sibling, it wraps around to the last child.
 * @param {Element} elem The reference element.
 * @return {Element} The previous sibling element cyclically.
 */
export function prevCyclic(elem: Element): Element {
  const parent = elem.parentElement
  if (!parent) return elem
  return (elem.previousElementSibling ?? parent.lastElementChild)!
}
