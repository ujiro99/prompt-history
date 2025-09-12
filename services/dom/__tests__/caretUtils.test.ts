/**
 * Tests for caretUtils.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { getCaretPosition } from "../caretUtils"
import {
  createMockInput,
  createMockTextarea,
  createMockContentEditable,
  setCaretPosition as helperSetCaretPosition,
  mockSelectionAPI,
  setupDOMEnvironment,
  cleanupDOMEnvironment,
} from "./helpers/domTestHelpers"

describe("caretUtils", () => {
  beforeEach(() => {
    setupDOMEnvironment()
  })

  afterEach(() => {
    cleanupDOMEnvironment()
  })

  describe("getCaretPosition", () => {
    it("should return 0 for null/undefined elements", () => {
      expect(getCaretPosition(null as any)).toBe(0)
      expect(getCaretPosition(undefined as any)).toBe(0)
    })

    it("should get caret position from input elements", () => {
      const input = createMockInput("Hello World")
      helperSetCaretPosition(input, 5)

      const position = getCaretPosition(input)
      expect(position).toBe(5)
    })

    it("should get caret position from textarea elements", () => {
      const textarea = createMockTextarea("Multi\nline\ntext")
      helperSetCaretPosition(textarea, 8)

      const position = getCaretPosition(textarea)
      expect(position).toBe(8)
    })

    it("should handle input with null selectionStart", () => {
      const input = createMockInput("test")
      Object.defineProperty(input, "selectionStart", {
        value: null,
        configurable: true,
      })

      const position = getCaretPosition(input)
      expect(position).toBe(0)
    })

    it("should get caret position from contenteditable elements", () => {
      const { mockSelection, mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable("Editable content")

      // Mock cloneContents to return a DocumentFragment with text
      const mockFragment = document.createDocumentFragment()
      const textNode = document.createTextNode("Edit")
      mockFragment.appendChild(textNode)
      mockRange.cloneContents.mockReturnValue(mockFragment)

      const position = getCaretPosition(editable)
      expect(position).toBe(4) // Length of "Edit"
      expect(mockSelection.getRangeAt).toHaveBeenCalledWith(0)
    })
    it("should handle contenteditable with no selection", () => {
      const editable = createMockContentEditable("test")

      Object.defineProperty(window, "getSelection", {
        value: () => null,
        configurable: true,
      })

      const position = getCaretPosition(editable)
      expect(position).toBe(0)
    })

    it("should handle contenteditable with no ranges", () => {
      const editable = createMockContentEditable("test")

      const mockSelection = {
        rangeCount: 0,
      }

      Object.defineProperty(window, "getSelection", {
        value: () => mockSelection,
        configurable: true,
      })

      const position = getCaretPosition(editable)
      expect(position).toBe(0)
    })

    it("should return 0 for non-input elements", () => {
      const div = document.createElement("div")
      div.textContent = "regular div"

      const position = getCaretPosition(div)
      expect(position).toBe(0)
    })

    it("should handle contenteditable with complex selection", () => {
      const { mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable()
      editable.innerHTML = "<div>First</div><div>Second</div>"

      // Mock a selection that spans multiple elements
      const mockFragment = document.createDocumentFragment()
      const divNode1 = document.createElement("div")
      const textNode1 = document.createTextNode("First")
      divNode1.appendChild(textNode1)
      const divNode2 = document.createElement("div")
      const textNode2 = document.createTextNode("Sec")
      divNode2.appendChild(textNode2)

      mockFragment.appendChild(divNode1)
      mockFragment.appendChild(divNode2)
      mockRange.cloneContents.mockReturnValue(mockFragment)

      const position = getCaretPosition(editable)
      expect(position).toBe(9) // Length of "First" + "\n"+ "Sec"
    })

    it("should handle contenteditable with line breaks correctly", () => {
      const { mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable()
      editable.innerHTML = "Line 1<br>Line 2<br>Line 3"

      // Mock cloneContents to return a DocumentFragment with DOM structure
      const mockFragment = document.createDocumentFragment()
      const textNode1 = document.createTextNode("Line 1")
      const brNode1 = document.createElement("br")
      const textNode2 = document.createTextNode("Line 2")
      const brNode2 = document.createElement("br")

      mockFragment.appendChild(textNode1)
      mockFragment.appendChild(brNode1)
      mockFragment.appendChild(textNode2)
      mockFragment.appendChild(brNode2)

      mockRange.cloneContents.mockReturnValue(mockFragment)

      const position = getCaretPosition(editable)
      // Extra newlines at the end is trimmed
      expect(position).toBe(13) // "Line 1" (6) + "\n" (1) + "Line 2" (6) = 13
    })

    it("should handle contenteditable with div elements correctly", () => {
      const { mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable()
      editable.innerHTML = "First<br>Second<div>Third</div>"

      // Mock cloneContents to return a DocumentFragment with DOM structure
      const mockFragment = document.createDocumentFragment()
      const textNode1 = document.createTextNode("First")
      const brNode = document.createElement("br")
      const textNode2 = document.createTextNode("Second")
      const divNode = document.createElement("div")
      const textNode3 = document.createTextNode("Third")
      divNode.appendChild(textNode3)

      mockFragment.appendChild(textNode1)
      mockFragment.appendChild(brNode)
      mockFragment.appendChild(textNode2)
      mockFragment.appendChild(divNode)

      mockRange.cloneContents.mockReturnValue(mockFragment)

      const position = getCaretPosition(editable)
      expect(position).toBe(18) // "First" (5) + "\n" (1) + "Second" (6) + "\n" (1) + "Third" (5) = 18
    })
  })
})
