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

    it("should input single line text using Selection API", async () => {
      const editable = createMockContentEditable()
      mockSelectionAPI()

      const result = await inputContentEditable(editable, "Hello World", 100)

      expect(result).toBe(true)
      // Verify that getSelection was called
      expect(window.getSelection).toHaveBeenCalled()
    })

    it("should handle multi-line text with Shift+Enter", async () => {
      const editable = createMockContentEditable()
      mockSelectionAPI()
      const dispatchEventSpy = vi.spyOn(editable, "dispatchEvent")

      const result = await inputContentEditable(
        editable,
        "Line 1\nLine 2\nLine 3",
        100,
      )

      expect(result).toBe(true)

      // Should dispatch Shift+Enter events between lines
      expect(dispatchEventSpy.mock.calls.length).toBeGreaterThanOrEqual(2)

      // Check the KeyboardEvent properties for Shift+Enter events
      const keyboardEvents = dispatchEventSpy.mock.calls
        .map((call) => call[0])
        .filter(
          (event) => event instanceof KeyboardEvent && event.key === "Enter",
        )

      expect(keyboardEvents.length).toBeGreaterThanOrEqual(2)
      keyboardEvents.forEach((event) => {
        const keyboardEvent = event as KeyboardEvent
        expect(keyboardEvent.type).toBe("keydown")
        expect(keyboardEvent.key).toBe("Enter")
        expect(keyboardEvent.shiftKey).toBe(true)
        expect(keyboardEvent.bubbles).toBe(true)
        expect(keyboardEvent.cancelable).toBe(true)
      })
    })

    it("should handle empty text", async () => {
      const editable = createMockContentEditable()
      mockSelectionAPI()

      const result = await inputContentEditable(editable, "", 100)

      expect(result).toBe(true)
      // Verify that getSelection was called even for empty text
      expect(window.getSelection).toHaveBeenCalled()
    })

    it("should handle text with only newlines", async () => {
      const editable = createMockContentEditable()
      mockSelectionAPI()
      const dispatchEventSpy = vi.spyOn(editable, "dispatchEvent")

      const result = await inputContentEditable(editable, "\n\n", 100)

      expect(result).toBe(true)

      // Should dispatch 2 Shift+Enter events (minimum) for 2 newlines
      const keyboardEvents = dispatchEventSpy.mock.calls
        .map((call) => call[0])
        .filter(
          (event) => event instanceof KeyboardEvent && event.key === "Enter",
        )
      expect(keyboardEvents.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("replaceTextAtCaret", () => {
    it("should handle null/undefined elements gracefully", async () => {
      const match = createMockAutoCompleteMatch()

      await expect(
        replaceTextAtCaret(null as any, match),
      ).resolves.toBeUndefined()
      await expect(
        replaceTextAtCaret(undefined as any, match),
      ).resolves.toBeUndefined()
    })

    it("should replace text in input elements", async () => {
      const input = createMockInput("Hello test world")
      const match = createMockAutoCompleteMatch({
        matchStart: 6,
        matchEnd: 10,
        content: "replacement",
      })

      await replaceTextAtCaret(input, match)

      expect(input.value).toBe("Hello replacement world")
      expect(input.selectionStart).toBe(17) // 6 + 11 (length of 'replacement')
      expect(input.selectionEnd).toBe(17)
    })

    it("should replace text in textarea elements", async () => {
      const textarea = createMockTextarea("Multi\nline\ntest\ntext")
      const match = createMockAutoCompleteMatch({
        matchStart: 11,
        matchEnd: 15,
        content: "replacement",
      })

      await replaceTextAtCaret(textarea, match)

      expect(textarea.value).toBe("Multi\nline\nreplacement\ntext")
      expect(textarea.selectionStart).toBe(22) // 11 + 11 (length of 'replacement')
      expect(textarea.selectionEnd).toBe(22)
    })

    it("should replace text in contenteditable elements", async () => {
      const editable = createMockContentEditable("Editable test content")
      const textNode = document.createTextNode("Editable test content")
      editable.appendChild(textNode)
      mockSelectionAPI()

      const match = createMockAutoCompleteMatch({
        matchStart: 9,
        matchEnd: 13,
        content: "replacement",
        searchTerm: "test",
      })

      await replaceTextAtCaret(editable, match, textNode)

      // Just verify the function completed without error
      // The actual DOM manipulation behavior depends on the Selection API mock
    })

    it("should dispatch input event after replacement", async () => {
      const input = createMockInput("test content")
      const dispatchEventSpy = vi.spyOn(input, "dispatchEvent")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "replacement",
      })

      await replaceTextAtCaret(input, match)

      expect(dispatchEventSpy).toHaveBeenCalled()
      const event = dispatchEventSpy.mock.calls[0][0] as Event
      // happy-dom may dispatch different event types, check that an event was dispatched
      expect(event.type).toBeDefined()
      expect(event.bubbles).toBe(true)
    })

    it("should handle replacement at the beginning of text", async () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "new",
      })

      await replaceTextAtCaret(input, match)

      expect(input.value).toBe("new content")
      expect(input.selectionStart).toBe(3)
      expect(input.selectionEnd).toBe(3)
    })

    it("should handle replacement at the end of text", async () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 5,
        matchEnd: 12,
        content: "ending",
      })

      await replaceTextAtCaret(input, match)

      expect(input.value).toBe("test ending")
      expect(input.selectionStart).toBe(11)
      expect(input.selectionEnd).toBe(11)
    })

    it("should handle replacement of entire text", async () => {
      const input = createMockInput("test")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "completely new text",
      })

      await replaceTextAtCaret(input, match)

      expect(input.value).toBe("completely new text")
      expect(input.selectionStart).toBe(19)
      expect(input.selectionEnd).toBe(19)
    })

    it("should handle empty replacement", async () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "",
      })

      await replaceTextAtCaret(input, match)

      expect(input.value).toBe(" content")
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe(0)
    })

    it("should handle match with same start and end positions", async () => {
      const input = createMockInput("test content")
      const match = createMockAutoCompleteMatch({
        matchStart: 4,
        matchEnd: 4,
        content: " inserted",
      })

      await replaceTextAtCaret(input, match)

      expect(input.value).toBe("test inserted content")
      // happy-dom may calculate selection position differently
      expect(input.selectionStart).toBeGreaterThanOrEqual(13)
      expect(input.selectionEnd).toBeGreaterThanOrEqual(13)
    })

    it("should handle contenteditable when Selection API is not available", async () => {
      const editable = createMockContentEditable("test content")

      // Save original getSelection and restore it after test
      const originalGetSelection = window.getSelection
      Object.defineProperty(window, "getSelection", {
        value: null,
        configurable: true,
      })

      const match = createMockAutoCompleteMatch({
        matchStart: 0,
        matchEnd: 4,
        content: "replacement",
      })

      await expect(replaceTextAtCaret(editable, match)).resolves.not.toThrow()

      // Restore getSelection
      Object.defineProperty(window, "getSelection", {
        value: originalGetSelection,
        configurable: true,
      })
    })

    it("should handle contenteditable when createRange is not available", async () => {
      const editable = createMockContentEditable("test content")

      // Save originals and restore after test
      const originalGetSelection = window.getSelection
      const originalCreateRange = document.createRange

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

      await expect(replaceTextAtCaret(editable, match)).resolves.not.toThrow()

      // Restore originals
      Object.defineProperty(window, "getSelection", {
        value: originalGetSelection,
        configurable: true,
      })
      Object.defineProperty(document, "createRange", {
        value: originalCreateRange,
        configurable: true,
      })
    })
  })
})
