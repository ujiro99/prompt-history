/**
 * Input and text replacement utilities
 */
import { sleep } from "../../lib/utils"
import { isEditable, isInput, isTextarea } from "./elementUtils"
import { extractElementContent } from "./textUtils"
import { setCaretPosition } from "./caretUtils"
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
): Promise<boolean> {
  if (!isEditable(el)) return false
  el.focus()
  const values = value.split("\n")

  for (const [idx, val] of values.entries()) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const node = document.createTextNode(val)
      range.insertNode(node)
      range.selectNodeContents(el)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }
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
 * Replace text at caret position with selected match
 */
export const replaceTextAtCaret = async (
  element: Element,
  match: AutoCompleteMatch,
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
    // For contenteditable elements, clear content first then input new content
    const htmlElement = element as HTMLElement
    htmlElement.innerHTML = ""

    // Use inputContentEditable to properly handle the content insertion
    await inputContentEditable(htmlElement, newContent, 20)

    // Set cursor position using the utility function
    const newCaretPos = match.matchStart + match.content.length
    setCaretPosition(element, newCaretPos)
  }

  // Trigger input event to notify other listeners
  const inputEvent = new Event("input", { bubbles: true })
  element.dispatchEvent(inputEvent)
}
