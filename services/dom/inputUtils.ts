/**
 * Input and text replacement utilities
 */
import { sleep } from "../../lib/utils"
import { isEditable } from "./elementUtils"
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
    const newCaretPos = match.matchStart + match.content.length
    ;(element as HTMLTextAreaElement).selectionStart = newCaretPos
    ;(element as HTMLTextAreaElement).selectionEnd = newCaretPos
  } else if (element.tagName.toLowerCase() === "input") {
    ;(element as HTMLInputElement).value = newContent
    const newCaretPos = match.matchStart + match.content.length
    ;(element as HTMLInputElement).selectionStart = newCaretPos
    ;(element as HTMLInputElement).selectionEnd = newCaretPos
  } else if (element.getAttribute("contenteditable") === "true") {
    // For contenteditable elements, we need to handle text replacement differently
    const htmlElement = element as HTMLElement
    htmlElement.textContent = newContent

    // Set cursor position using the utility function
    const newCaretPos = match.matchStart + match.content.length
    setCaretPosition(element, newCaretPos)
  }

  // Trigger input event to notify other listeners
  const inputEvent = new Event("input", { bubbles: true })
  element.dispatchEvent(inputEvent)
}
