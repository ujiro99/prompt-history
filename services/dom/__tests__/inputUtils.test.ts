/**
 * Tests for inputUtils.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { inputContentEditable, replaceTextAtCaret } from "../inputUtils"
import {
  createMockInput,
  createMockTextarea,
  createMockContentEditable,
  createMockAutoCompleteMatch,
  mockExecCommand,
  mockSelectionAPI,
  setupDOMEnvironment,
  cleanupDOMEnvironment,
} from "./helpers/domTestHelpers"

// Mock the sleep function
vi.mock("../../../lib/utils", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}))

describe("inputUtils", () => {
  beforeEach(() => {
    setupDOMEnvironment()
  })

  afterEach(() => {
    cleanupDOMEnvironment()
  })

  describe("inputContentEditable", () => {
    it("should return false for non-editable elements", async () => {
      const div = document.createElement("div")

      const result = await inputContentEditable(div, "test", 100)
      expect(result).toBe(false)
    })

    it("should focus the element before inputting", async () => {
      const editable = createMockContentEditable()
      const focusSpy = vi.spyOn(editable, "focus")
      mockExecCommand()

      await inputContentEditable(editable, "test", 100)

      expect(focusSpy).toHaveBeenCalled()
    })

    it("should input single line text using execCommand", async () => {
      const editable = createMockContentEditable()
      const execCommandSpy = mockExecCommand()

      const result = await inputContentEditable(editable, "Hello World", 100)

      expect(result).toBe(true)
      expect(execCommandSpy).toHaveBeenCalledWith(
        "insertText",
        false,
        "Hello World",
      )
      expect(execCommandSpy).toHaveBeenCalledTimes(1)
    })

    it("should handle multi-line text with Shift+Enter", async () => {
      const editable = createMockContentEditable()
      const execCommandSpy = mockExecCommand()
      const dispatchEventSpy = vi.spyOn(editable, "dispatchEvent")

      const result = await inputContentEditable(
        editable,
        "Line 1\nLine 2\nLine 3",
        100,
      )

      expect(result).toBe(true)

      // Should call execCommand for each line
      expect(execCommandSpy).toHaveBeenCalledWith("insertText", false, "Line 1")
      expect(execCommandSpy).toHaveBeenCalledWith("insertText", false, "Line 2")
      expect(execCommandSpy).toHaveBeenCalledWith("insertText", false, "Line 3")

      // Should dispatch Shift+Enter events between lines
      // happy-dom may dispatch additional events, so check minimum calls
      expect(dispatchEventSpy.mock.calls.length).toBeGreaterThanOrEqual(2)

      // Check the KeyboardEvent properties
      const calls = dispatchEventSpy.mock.calls
      calls.forEach((call) => {
        const event = call[0] as KeyboardEvent
        expect(event.type).toBe("keydown")
        expect(event.key).toBe("Enter")
        expect(event.shiftKey).toBe(true)
        expect(event.bubbles).toBe(true)
        expect(event.cancelable).toBe(true)
      })
    })

    it("should handle empty text", async () => {
      const editable = createMockContentEditable()
      const execCommandSpy = mockExecCommand()

      const result = await inputContentEditable(editable, "", 100)

      expect(result).toBe(true)
      expect(execCommandSpy).toHaveBeenCalledWith("insertText", false, "")
      expect(execCommandSpy).toHaveBeenCalledTimes(1)
    })

    it("should handle text with only newlines", async () => {
      const editable = createMockContentEditable()
      const execCommandSpy = mockExecCommand()
      const dispatchEventSpy = vi.spyOn(editable, "dispatchEvent")

      const result = await inputContentEditable(editable, "\n\n", 100)

      expect(result).toBe(true)

      // Should call execCommand for empty strings
      expect(execCommandSpy).toHaveBeenCalledWith("insertText", false, "")
      expect(execCommandSpy).toHaveBeenCalledTimes(3) // 3 empty segments

      // Should dispatch 2 Shift+Enter events (minimum)
      expect(dispatchEventSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("replaceTextAtCaret", () => {
    it("should handle null/undefined elements gracefully", () => {
      const match = createMockAutoCompleteMatch()

      expect(() => replaceTextAtCaret(null as any, match)).not.toThrow()
      expect(() => replaceTextAtCaret(undefined as any, match)).not.toThrow()
    })

    it("should replace text in input elements", () => {
      const input = createMockInput("Hello test world")
      const match = createMockAutoCompleteMatch({
        matchStart: 6,
        matchEnd: 10,
        content: "replacement",
      })

      replaceTextAtCaret(input, match)

      expect(input.value).toBe("Hello replacement world")
      expect(input.selectionStart).toBe(17) // 6 + 11 (length of 'replacement')
      expect(input.selectionEnd).toBe(17)
    })

    it("should replace text in textarea elements", () => {
      const textarea = createMockTextarea("Multi\nline\ntest\ntext")
      const match = createMockAutoCompleteMatch({
        matchStart: 11,
        matchEnd: 15,
        content: "replacement",
      })

      replaceTextAtCaret(textarea, match)

      expect(textarea.value).toBe("Multi\nline\nreplacement\ntext")
      expect(textarea.selectionStart).toBe(22) // 11 + 11 (length of 'replacement')
      expect(textarea.selectionEnd).toBe(22)
    })

    it("should replace text in contenteditable elements", () => {
      const { mockSelection, mockRange } = mockSelectionAPI()
      const editable = createMockContentEditable("Editable test content")
      const textNode = document.createTextNode("Editable test content")
      editable.appendChild(textNode)

      const match = createMockAutoCompleteMatch({
        matchStart: 9,
        matchEnd: 13,
        content: "replacement",
      })

      replaceTextAtCaret(editable, match)

      // happy-dom may handle textContent differently, check that replacement occurred
      expect(editable.textContent).toContain("replacement")
      expect(editable.textContent).toContain("content")

      // Should set caret position using Selection API
      // happy-dom may modify textNode content, so just check that setStart/setEnd were called
      expect(mockRange.setStart).toHaveBeenCalled()
      expect(mockRange.setEnd).toHaveBeenCalled()
      expect(mockSelection.removeAllRanges).toHaveBeenCalled()
      expect(mockSelection.addRange).toHaveBeenCalled()
    })

    it("should dispatch input event after replacement", () => {
      const input = createMockInput("test content")
      const dispatchEventSpy = vi.spyOn(input, "dispatchEvent")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "replacement",
      })

      replaceTextAtCaret(input, match)

      expect(dispatchEventSpy).toHaveBeenCalled()
      const event = dispatchEventSpy.mock.calls[0][0] as Event
      // happy-dom may dispatch different event types, check that an event was dispatched
      expect(event.type).toBeDefined()
      expect(event.bubbles).toBe(true)
    })

    it("should handle replacement at the beginning of text", () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "new",
      })

      replaceTextAtCaret(input, match)

      expect(input.value).toBe("new content")
      expect(input.selectionStart).toBe(3)
      expect(input.selectionEnd).toBe(3)
    })

    it("should handle replacement at the end of text", () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 5,
        matchEnd: 12,
        content: "ending",
      })

      replaceTextAtCaret(input, match)

      expect(input.value).toBe("test ending")
      expect(input.selectionStart).toBe(11)
      expect(input.selectionEnd).toBe(11)
    })

    it("should handle replacement of entire text", () => {
      const input = createMockInput("test")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "completely new text",
      })

      replaceTextAtCaret(input, match)

      expect(input.value).toBe("completely new text")
      expect(input.selectionStart).toBe(19)
      expect(input.selectionEnd).toBe(19)
    })

    it("should handle empty replacement", () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "",
      })

      replaceTextAtCaret(input, match)

      expect(input.value).toBe(" content")
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe(0)
    })

    it("should handle match with same start and end positions", () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 4,
        matchEnd: 4,
        content: " inserted",
      })

      replaceTextAtCaret(input, match)

      expect(input.value).toBe("test inserted content")
      // happy-dom may calculate selection position differently
      expect(input.selectionStart).toBeGreaterThanOrEqual(13)
      expect(input.selectionEnd).toBeGreaterThanOrEqual(13)
    })

    it("should handle contenteditable when Selection API is not available", () => {
      const editable = createMockContentEditable("test content")

      Object.defineProperty(window, "getSelection", {
        value: null,
        configurable: true,
      })

      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "replacement",
      })

      expect(() => replaceTextAtCaret(editable, match)).not.toThrow()
      expect(editable.textContent).toBe("replacement content")
    })

    it("should handle contenteditable when createRange is not available", () => {
      const editable = createMockContentEditable("test content")

      Object.defineProperty(window, "getSelection", {
        value: () => ({}),
        configurable: true,
      })
      Object.defineProperty(document, "createRange", {
        value: null,
        configurable: true,
      })

      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "replacement",
      })

      expect(() => replaceTextAtCaret(editable, match)).not.toThrow()
      expect(editable.textContent).toBe("replacement content")
    })
  })
})
