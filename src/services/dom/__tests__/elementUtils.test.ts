/**
 * Tests for elementUtils.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  isInputOrTextarea,
  isHtmlElement,
  isTextNode,
  isInput,
  isTextarea,
  isEditable,
  getFocusNode,
} from "../elementUtils"
import {
  createMockInput,
  createMockTextarea,
  createMockContentEditable,
  createMockEvent,
  setupDOMEnvironment,
  cleanupDOMEnvironment,
} from "./helpers/domTestHelpers"

describe("elementUtils", () => {
  beforeEach(() => {
    setupDOMEnvironment()
  })

  afterEach(() => {
    cleanupDOMEnvironment()
  })

  describe("isInputOrTextarea", () => {
    it("should return true for text input elements", () => {
      const input = createMockInput("", "text")
      expect(isInputOrTextarea(input)).toBe(true)
    })

    it("should return true for supported input types", () => {
      const supportedTypes = [
        "text",
        "url",
        "number",
        "search",
        "date",
        "datetime-local",
        "month",
        "week",
        "time",
      ]

      supportedTypes.forEach((type) => {
        const input = createMockInput("", type)
        expect(isInputOrTextarea(input)).toBe(true)
      })
    })

    it("should return false for unsupported input types", () => {
      const unsupportedTypes = [
        "password",
        "email",
        "submit",
        "button",
        "checkbox",
        "radio",
      ]

      unsupportedTypes.forEach((type) => {
        const input = createMockInput("", type)
        expect(isInputOrTextarea(input)).toBe(false)
      })
    })

    it("should return true for textarea elements", () => {
      const textarea = createMockTextarea()
      expect(isInputOrTextarea(textarea)).toBe(true)
    })

    it("should return false for other elements", () => {
      const div = document.createElement("div")
      expect(isInputOrTextarea(div)).toBe(false)
    })

    it("should return false for null or undefined", () => {
      expect(isInputOrTextarea(null)).toBe(false)
      expect(isInputOrTextarea(undefined as any)).toBe(false)
    })
  })

  describe("isHtmlElement", () => {
    it("should return true for HTML elements", () => {
      const div = document.createElement("div")
      const span = document.createElement("span")
      const input = createMockInput()

      expect(isHtmlElement(div)).toBe(true)
      expect(isHtmlElement(span)).toBe(true)
      expect(isHtmlElement(input)).toBe(true)
    })

    it("should return false for text nodes", () => {
      const textNode = document.createTextNode("test")
      expect(isHtmlElement(textNode)).toBe(false)
    })

    it("should return false for non-node values", () => {
      expect(isHtmlElement(null)).toBe(false)
      expect(isHtmlElement(undefined)).toBe(false)
      expect(isHtmlElement("string")).toBe(false)
      expect(isHtmlElement(42)).toBe(false)
      expect(isHtmlElement({})).toBe(false)
    })
  })

  describe("isTextNode", () => {
    it("should return true for text nodes", () => {
      const textNode = document.createTextNode("test content")
      expect(isTextNode(textNode)).toBe(true)
    })

    it("should return false for HTML elements", () => {
      const div = document.createElement("div")
      expect(isTextNode(div)).toBe(false)
    })

    it("should return false for null or undefined", () => {
      expect(isTextNode(null)).toBe(false)
      expect(isTextNode(undefined)).toBe(false)
    })

    it("should return false for non-node values", () => {
      expect(isTextNode("string")).toBe(false)
      expect(isTextNode(42)).toBe(false)
      expect(isTextNode({})).toBe(false)
    })
  })

  describe("isInput", () => {
    it("should return true for input elements", () => {
      const input = createMockInput()
      expect(isInput(input)).toBe(true)
    })

    it("should return false for non-input elements", () => {
      const textarea = createMockTextarea()
      const div = document.createElement("div")

      expect(isInput(textarea)).toBe(false)
      expect(isInput(div)).toBe(false)
      expect(isInput(null)).toBe(false)
    })
  })

  describe("isTextarea", () => {
    it("should return true for textarea elements", () => {
      const textarea = createMockTextarea()
      expect(isTextarea(textarea)).toBe(true)
    })

    it("should return false for non-textarea elements", () => {
      const input = createMockInput()
      const div = document.createElement("div")

      expect(isTextarea(input)).toBe(false)
      expect(isTextarea(div)).toBe(false)
      expect(isTextarea(null)).toBe(false)
    })
  })

  describe("isEditable", () => {
    it("should return true for contenteditable elements", () => {
      const editable = createMockContentEditable()
      expect(isEditable(editable)).toBe(true)
    })

    it("should return false for non-contenteditable elements", () => {
      const div = document.createElement("div")
      const input = createMockInput()

      expect(isEditable(div)).toBe(false)
      expect(isEditable(input)).toBe(false)
    })

    it("should return false for non-HTML elements", () => {
      expect(isEditable(null)).toBe(false)
      expect(isEditable(undefined)).toBe(false)
      expect(isEditable("string")).toBe(false)
    })
  })

  describe("getFocusNode", () => {
    it("should return the target for input/textarea elements", () => {
      const input = createMockInput()
      const textarea = createMockTextarea()

      const inputEvent = createMockEvent(input)
      const textareaEvent = createMockEvent(textarea)

      expect(getFocusNode(inputEvent)).toBe(input)
      expect(getFocusNode(textareaEvent)).toBe(textarea)
    })

    it("should return selection focusNode when it is an HTML element", () => {
      const div = document.createElement("div")
      const event = createMockEvent(div)

      const mockSelection = {
        focusNode: div,
      }

      Object.defineProperty(window, "getSelection", {
        value: () => mockSelection,
        configurable: true,
      })

      expect(getFocusNode(event)).toBe(div)
    })

    it("should return parent of text node when focusNode is a text node", () => {
      const div = document.createElement("div")
      const textNode = document.createTextNode("test")
      div.appendChild(textNode)

      const event = createMockEvent(div)

      const mockSelection = {
        focusNode: textNode,
      }

      Object.defineProperty(window, "getSelection", {
        value: () => mockSelection,
        configurable: true,
      })

      expect(getFocusNode(event)).toBe(div)
    })

    it("should return event target when it is an HTML element as fallback", () => {
      const div = document.createElement("div")
      const event = createMockEvent(div)

      const mockSelection = {
        focusNode: null,
      }

      Object.defineProperty(window, "getSelection", {
        value: () => mockSelection,
        configurable: true,
      })

      expect(getFocusNode(event)).toBe(div)
    })

    it("should return null when no suitable focus node is found", () => {
      const textNode = document.createTextNode("test")
      const event = createMockEvent(textNode)

      const mockSelection = {
        focusNode: null,
      }

      Object.defineProperty(window, "getSelection", {
        value: () => mockSelection,
        configurable: true,
      })

      expect(getFocusNode(event)).toBe(null)
    })

    it("should handle case when getSelection returns null", () => {
      const div = document.createElement("div")
      const event = createMockEvent(div)

      Object.defineProperty(window, "getSelection", {
        value: () => null,
        configurable: true,
      })

      expect(getFocusNode(event)).toBe(div)
    })
  })
})
