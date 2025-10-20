/**
 * Tests for caretUtils.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getCaretPosition, getCaretCoordinates } from "../caretUtils"
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
      expect(getCaretPosition(null as any)).toEqual({
        position: 0,
        newlineCount: 0,
      })
      expect(getCaretPosition(undefined as any)).toEqual({
        position: 0,
        newlineCount: 0,
      })
    })

    it("should get caret position from input elements", () => {
      const input = createMockInput("Hello World")
      helperSetCaretPosition(input, 5)

      const position = getCaretPosition(input)
      expect(position).toEqual({ position: 5, newlineCount: 0 })
    })

    it("should get caret position from textarea elements", () => {
      const textarea = createMockTextarea("Multi\nline\ntext")
      helperSetCaretPosition(textarea, 8)

      const position = getCaretPosition(textarea)
      // "Multi\nli" = position 8, includes 1 newline
      expect(position).toEqual({ position: 8, newlineCount: 1 })
    })

    it("should handle input with null selectionStart", () => {
      const input = createMockInput("test")
      Object.defineProperty(input, "selectionStart", {
        value: null,
        configurable: true,
      })

      const position = getCaretPosition(input)
      expect(position).toEqual({ position: 0, newlineCount: 0 })
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
      expect(position).toEqual({ position: 4, newlineCount: 0 }) // Length of "Edit"
      expect(mockSelection.getRangeAt).toHaveBeenCalledWith(0)
    })
    it("should handle contenteditable with no selection", () => {
      const editable = createMockContentEditable("test")

      Object.defineProperty(window, "getSelection", {
        value: () => null,
        configurable: true,
      })

      const position = getCaretPosition(editable)
      expect(position).toEqual({ position: 0, newlineCount: 0 })
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
      expect(position).toEqual({ position: 0, newlineCount: 0 })
    })

    it("should return 0 for non-input elements", () => {
      const div = document.createElement("div")
      div.textContent = "regular div"

      const position = getCaretPosition(div)
      expect(position).toEqual({ position: 0, newlineCount: 0 })
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
      // "First" + "\n"+ "Sec" = 9 characters, 1 newline
      expect(position).toEqual({ position: 9, newlineCount: 1 })
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
      // "Line 1" (6) + "\n" (1) + "Line 2" (6) = 13, 1 newline (trailing newline removed)
      expect(position).toEqual({ position: 13, newlineCount: 1 })
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
      // "First" (5) + "\n" (1) + "Second" (6) + "\n" (1) + "Third" (5) = 18, 2 newlines
      expect(position).toEqual({ position: 18, newlineCount: 2 })
    })
  })

  describe("getCaretCoordinates", () => {
    it("should return null for null/undefined elements", () => {
      expect(getCaretCoordinates(null as any)).toBe(null)
      expect(getCaretCoordinates(undefined as any)).toBe(null)
    })

    it("should get caret coordinates from input elements", () => {
      const input = createMockInput("Hello World")
      helperSetCaretPosition(input, 5)

      // Mock getComputedStyle
      const mockComputedStyle = {
        fontFamily: "Arial",
        fontSize: "14px",
        fontWeight: "normal",
        fontStyle: "normal",
        letterSpacing: "normal",
        textTransform: "none",
        wordSpacing: "normal",
        textIndent: "0",
        whiteSpace: "nowrap",
        lineHeight: "20px",
        padding: "4px",
        border: "1px solid #ccc",
        boxSizing: "border-box",
        width: "200px",
        height: "30px",
        overflow: "hidden",
        getPropertyValue: vi.fn(
          (prop: string) => (mockComputedStyle as any)[prop] || "",
        ),
      }
      vi.spyOn(window, "getComputedStyle").mockReturnValue(
        mockComputedStyle as any,
      )

      // Mock getBoundingClientRect for the input
      input.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        right: 300,
        bottom: 80,
        width: 200,
        height: 30,
      })

      const coords = getCaretCoordinates(input)
      expect(coords).toBeTruthy()
      expect(coords?.x).toBeGreaterThanOrEqual(100) // Should be at least at the input's left edge
      expect(coords?.y).toBeGreaterThanOrEqual(50) // Should be at least at the input's top edge
      expect(coords?.height).toBe(20) // From lineHeight
    })

    it("should get caret coordinates from textarea elements", () => {
      const textarea = createMockTextarea("Line 1\nLine 2\nLine 3")
      helperSetCaretPosition(textarea, 14) // Position at "Line 3"

      // Mock getComputedStyle
      const mockComputedStyle = {
        fontFamily: "monospace",
        fontSize: "12px",
        fontWeight: "normal",
        fontStyle: "normal",
        letterSpacing: "normal",
        textTransform: "none",
        wordSpacing: "normal",
        textIndent: "0",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        lineHeight: "18px",
        padding: "5px",
        border: "1px solid #999",
        boxSizing: "border-box",
        width: "300px",
        height: "100px",
        overflow: "auto",
        getPropertyValue: vi.fn(
          (prop: string) => (mockComputedStyle as any)[prop] || "",
        ),
      }
      vi.spyOn(window, "getComputedStyle").mockReturnValue(
        mockComputedStyle as any,
      )

      // Mock getBoundingClientRect for the textarea
      textarea.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50,
        top: 100,
        right: 350,
        bottom: 200,
        width: 300,
        height: 100,
      })

      const coords = getCaretCoordinates(textarea)
      expect(coords).toBeTruthy()
      expect(coords?.x).toBeGreaterThanOrEqual(50)
      expect(coords?.y).toBeGreaterThanOrEqual(100)
      expect(coords?.height).toBe(18) // From lineHeight
    })

    it("should handle scrolled input elements", () => {
      const input = createMockInput(
        "This is a very long text that would cause scrolling",
      )
      helperSetCaretPosition(input, 40)

      // Mock scrollLeft to simulate horizontal scrolling
      Object.defineProperty(input, "scrollLeft", {
        value: 50,
        configurable: true,
      })
      Object.defineProperty(input, "scrollTop", {
        value: 0,
        configurable: true,
      })

      // Mock getComputedStyle
      const mockComputedStyle = {
        fontFamily: "Arial",
        fontSize: "14px",
        lineHeight: "20px",
        padding: "4px",
        border: "1px solid #ccc",
        boxSizing: "border-box",
        width: "150px",
        height: "30px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        getPropertyValue: vi.fn(
          (prop: string) => (mockComputedStyle as any)[prop] || "",
        ),
      }
      vi.spyOn(window, "getComputedStyle").mockReturnValue(
        mockComputedStyle as any,
      )

      // Mock getBoundingClientRect
      input.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        right: 250,
        bottom: 80,
        width: 150,
        height: 30,
      })

      const coords = getCaretCoordinates(input)
      expect(coords).toBeTruthy()
      // The x coordinate should account for scrollLeft
      expect(coords?.x).toBeDefined()
      expect(coords?.y).toBeDefined()
      expect(coords?.height).toBe(20)
    })

    it("should get caret coordinates from contenteditable elements", () => {
      const { mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable("Editable content")

      // Mock getBoundingClientRect for the range
      const mockRangeBounds = {
        left: 120,
        top: 60,
        right: 120,
        bottom: 80,
        width: 0,
        height: 20,
      }
      mockRange.getBoundingClientRect = vi.fn().mockReturnValue(mockRangeBounds)
      mockRange.collapse = vi.fn()

      const coords = getCaretCoordinates(editable)
      expect(coords).toBeTruthy()
      expect(coords?.x).toBe(120)
      expect(coords?.y).toBe(60)
      expect(coords?.height).toBe(20)
    })

    it("should handle contenteditable with zero-width/height rect", () => {
      const { mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable("Test")

      // Mock getBoundingClientRect to return zero width and height
      mockRange.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      })
      mockRange.collapse = vi.fn()
      mockRange.insertNode = vi.fn()

      // Mock span element's getBoundingClientRect
      const mockSpanRect = {
        left: 150,
        top: 70,
        right: 150,
        bottom: 90,
        width: 0,
        height: 20,
      }

      // Override createElement to return a span with mocked getBoundingClientRect
      const originalCreateElement = document.createElement
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        const element = originalCreateElement.call(document, tagName)
        if (tagName === "span") {
          element.getBoundingClientRect = vi.fn().mockReturnValue(mockSpanRect)
          element.remove = vi.fn()
        }
        return element
      })

      const coords = getCaretCoordinates(editable)
      expect(coords).toBeTruthy()
      expect(coords?.x).toBe(150)
      expect(coords?.y).toBe(70)
      expect(coords?.height).toBe(20)
      expect(mockRange.insertNode).toHaveBeenCalled()
    })

    it("should return null for contenteditable with no selection", () => {
      const editable = createMockContentEditable("test")

      Object.defineProperty(window, "getSelection", {
        value: () => null,
        configurable: true,
      })

      const coords = getCaretCoordinates(editable)
      expect(coords).toBe(null)
    })

    it("should return null for contenteditable with no ranges", () => {
      const editable = createMockContentEditable("test")

      const mockSelection = {
        rangeCount: 0,
      }

      Object.defineProperty(window, "getSelection", {
        value: () => mockSelection,
        configurable: true,
      })

      const coords = getCaretCoordinates(editable)
      expect(coords).toBe(null)
    })

    it("should return null for non-input elements", () => {
      const div = document.createElement("div")
      div.textContent = "regular div"

      const coords = getCaretCoordinates(div)
      expect(coords).toBe(null)
    })

    it("should handle input with fallback to fontSize when lineHeight is not set", () => {
      const input = createMockInput("Test")
      helperSetCaretPosition(input, 2)

      // Mock getComputedStyle with no lineHeight
      const mockComputedStyle = {
        fontFamily: "Arial",
        fontSize: "16px",
        lineHeight: "",
        padding: "4px",
        border: "1px solid #ccc",
        boxSizing: "border-box",
        width: "200px",
        height: "30px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        getPropertyValue: vi.fn(
          (prop: string) => (mockComputedStyle as any)[prop] || "",
        ),
      }
      vi.spyOn(window, "getComputedStyle").mockReturnValue(
        mockComputedStyle as any,
      )

      input.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        right: 300,
        bottom: 80,
        width: 200,
        height: 30,
      })

      const coords = getCaretCoordinates(input)
      expect(coords).toBeTruthy()
      expect(coords?.height).toBe(16) // Should use fontSize value
    })
  })
})
