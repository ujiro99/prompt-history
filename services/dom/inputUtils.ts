/**
 * Input and text replacement utilities
 */
import { sleep } from "../../lib/utils"
import { isEditable, isInput, isTextarea } from "./elementUtils"
import { extractElementContent } from "./textUtils"
import type { AutoCompleteMatch } from "../autoComplete/types"

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
  nodeAtCaret?: Node,
): Promise<boolean> {
  if (!isEditable(el)) return false
  el.focus()
  const values = value.split("\n")

  for (const [idx, val] of values.entries()) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (nodeAtCaret) {
        range.setStart(nodeAtCaret, nodeAtCaret.textContent?.length || 0)
        range.setEnd(nodeAtCaret, nodeAtCaret.textContent?.length || 0)
        nodeAtCaret = undefined // Only use nodeAtCaret for the first insertion
      }
      const node = document.createTextNode(val)
      range.insertNode(node)

      // Move caret to end of inserted text node
      const lastOffset = node.length
      range.setStart(node, lastOffset)
      range.setEnd(node, lastOffset)
      selection.removeAllRanges()
      selection.addRange(range)

      if (idx < values.length - 1) {
        await sleep(interval / 2)
        await typeShiftEnter(el)
        await sleep(interval / 2)
      }
    }
  }
  return true
}

/**
 * Simulate typing Shift+Enter key event on an element.
 */
async function typeShiftEnter(node: Node): Promise<void> {
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
  node.dispatchEvent(down)
}

/**
 * Replace text at caret position with selected match
 */
export const replaceTextAtCaret = async (
  element: Element,
  match: AutoCompleteMatch,
  nodeAtCaret?: Node | null,
): Promise<void> => {
  if (!element) return

  const currentContent = extractElementContent(element)
  const newContent =
    currentContent.substring(0, match.matchStart) +
    match.content +
    currentContent.substring(match.matchEnd)

  // Set new content based on element type
  if (isTextarea(element)) {
    element.value = newContent
    const newCaretPos = match.matchStart + match.content.length
    element.selectionStart = newCaretPos
    element.selectionEnd = newCaretPos
  } else if (isInput(element)) {
    element.value = newContent
    const newCaretPos = match.matchStart + match.content.length
    element.selectionStart = newCaretPos
    element.selectionEnd = newCaretPos
  } else if (isEditable(element)) {
    // For contenteditable elements, clear content first then input new content.
    const htmlElement = element as HTMLElement

    // Select and delete the matched text.
    if (nodeAtCaret) {
      const start = nodeAtCaret.textContent?.lastIndexOf(match.searchTerm)
      if (start === undefined || start === -1) return
      const range = document.createRange()
      range.setStart(nodeAtCaret, start)
      range.setEnd(nodeAtCaret, start + match.searchTerm.length)
      range.deleteContents()

      // Use inputContentEditable to properly handle the content insertion.
      await inputContentEditable(htmlElement, match.content, 20, nodeAtCaret)
    }
  }

  // Trigger input event to notify other listeners.
  const inputEvent = new Event("input", { bubbles: true })
  element.dispatchEvent(inputEvent)
}
