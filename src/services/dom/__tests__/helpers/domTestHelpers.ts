/**
 * DOM test helpers for creating mock elements and setting up test environments
 */
import { vi } from "vitest"

/**
 * Create a mock input element with specified value and type
 */
export const createMockInput = (
  value = "",
  type = "text",
): HTMLInputElement => {
  const input = document.createElement("input")
  input.type = type
  input.value = value
  return input
}

/**
 * Create a mock textarea element with specified value
 */
export const createMockTextarea = (value = ""): HTMLTextAreaElement => {
  const textarea = document.createElement("textarea")
  textarea.value = value
  return textarea
}

/**
 * Create a mock contenteditable element with specified content
 */
export const createMockContentEditable = (content = ""): HTMLDivElement => {
  const div = document.createElement("div")
  div.contentEditable = "true"
  div.textContent = content
  return div
}

/**
 * Create a mock HTML element with nested structure for testing normalization
 */
export const createMockHtmlWithNewlines = (): HTMLDivElement => {
  const container = document.createElement("div")
  container.innerHTML = `
    <div>First line</div>
    <br>
    <p>Second paragraph</p>
    <div>
      <div>Nested content</div>
    </div>
  `
  return container
}

/**
 * Mock Selection API for testing caret operations
 */
export const mockSelectionAPI = () => {
  const mockRange = {
    cloneRange: vi.fn().mockReturnThis(),
    selectNodeContents: vi.fn(),
    setStart: vi.fn(),
    setEnd: vi.fn(),
    toString: vi.fn().mockReturnValue("mock text"),
    cloneContents: vi.fn().mockReturnValue(document.createDocumentFragment()),
    endContainer: document.createTextNode("test"),
    endOffset: 0,
    getBoundingClientRect: vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    }),
    collapse: vi.fn(),
    insertNode: vi.fn(),
    deleteContents: vi.fn(),
  }

  const mockSelection = {
    getRangeAt: vi.fn().mockReturnValue(mockRange),
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
    rangeCount: 1,
    focusNode: null as Node | null,
  }

  Object.defineProperty(window, "getSelection", {
    value: vi.fn().mockReturnValue(mockSelection),
    configurable: true,
  })

  Object.defineProperty(document, "createRange", {
    value: vi.fn().mockReturnValue(mockRange),
    configurable: true,
  })

  return { mockSelection, mockRange }
}

/**
 * Mock execCommand for testing contenteditable input
 */
export const mockExecCommand = () => {
  const execCommandSpy = vi.fn().mockReturnValue(true)
  Object.defineProperty(document, "execCommand", {
    value: execCommandSpy,
    configurable: true,
  })
  return execCommandSpy
}

/**
 * Setup caret position for input/textarea elements
 */
export const setCaretPosition = (
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number,
) => {
  element.selectionStart = position
  element.selectionEnd = position
}

/**
 * Create a mock AutoCompleteMatch for testing text replacement
 */
export const createMockAutoCompleteMatch = (overrides = {}) => ({
  id: "test-prompt",
  name: "Test Prompt",
  content: "Test content for replacement",
  matchStart: 0,
  matchEnd: 4,
  newlineCount: 0,
  searchTerm: "Test",
  isPinned: false,
  matchType: "prompt" as const,
  ...overrides,
})

/**
 * Create a mock Event for testing event handling
 */
export const createMockEvent = (target: EventTarget, type = "click"): Event => {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, "target", {
    value: target,
    configurable: true,
  })
  return event
}

/**
 * Setup DOM environment before tests
 */
export const setupDOMEnvironment = () => {
  // Ensure document.body exists
  if (!document.body) {
    document.body = document.createElement("body")
  }

  // Setup basic DOM methods
  if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 100,
      bottom: 20,
      width: 100,
      height: 20,
    })
  }
}

/**
 * Cleanup DOM environment after tests
 */
export const cleanupDOMEnvironment = () => {
  // Clear document body
  if (document.body) {
    document.body.innerHTML = ""
  }

  // Reset mocked functions
  vi.restoreAllMocks()
}
