/**
 * Tests for textUtils.ts
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { normalizeHtmlNewlines, extractElementContent } from "../textUtils"
import {
  createMockInput,
  createMockTextarea,
  createMockContentEditable,
  setupDOMEnvironment,
  cleanupDOMEnvironment,
} from "./helpers/domTestHelpers"

describe("textUtils", () => {
  beforeEach(() => {
    setupDOMEnvironment()
  })

  afterEach(() => {
    cleanupDOMEnvironment()
  })

  describe("normalizeHtmlNewlines", () => {
    it("should convert br tags to newlines", () => {
      const container = document.createElement("div")
      container.innerHTML = "First line<br>Second line<br>Third line"

      const result = normalizeHtmlNewlines(container)
      expect(result).toBe("First line\nSecond line\nThird line")
    })

    it("should convert div tags to newlines", () => {
      const container = document.createElement("div")
      container.innerHTML = "<div>First line</div><div>Second line</div>"

      const result = normalizeHtmlNewlines(container)
      expect(result).toBe("First line\nSecond line")
    })

    it("should convert p tags to newlines", () => {
      const container = document.createElement("div")
      container.innerHTML = "<p>First paragraph</p><p>Second paragraph</p>"

      const result = normalizeHtmlNewlines(container)
      expect(result).toBe("First paragraph\nSecond paragraph")
    })

    it("should handle nested elements correctly", () => {
      const container = document.createElement("div")
      container.innerHTML = `
        <div>
          <div>Nested content</div>
          <p>Nested paragraph</p>
        </div>
        <div>Another line</div>
      `

      const result = normalizeHtmlNewlines(container)
      expect(result).toContain("Nested content")
      expect(result).toContain("Nested paragraph")
      expect(result).toContain("Another line")
    })

    it("should preserve text content", () => {
      const container = document.createElement("div")
      container.innerHTML = "Plain text with <span>inline</span> elements"

      const result = normalizeHtmlNewlines(container)
      expect(result).toBe("Plain text with inline elements")
    })

    it("should handle mixed content types", () => {
      const container = document.createElement("div")
      container.innerHTML = `
        Text before
        <div>Div content</div>
        <br>
        <p>Paragraph content</p>
        Text after
      `

      const result = normalizeHtmlNewlines(container)
      expect(result).toContain("Text before")
      expect(result).toContain("Div content")
      expect(result).toContain("Paragraph content")
      expect(result).toContain("Text after")
    })

    it("should remove trailing newlines", () => {
      const container = document.createElement("div")
      container.innerHTML = "<div>Content</div><div></div><div></div>"

      const result = normalizeHtmlNewlines(container)
      expect(result).toBe("Content")
    })

    it("should handle empty elements", () => {
      const container = document.createElement("div")
      container.innerHTML = ""

      const result = normalizeHtmlNewlines(container)
      expect(result).toBe("")
    })

    it("should handle complex nested structure", () => {
      const container = document.createElement("div")
      container.innerHTML = `
        <div>
          First line
          <br>
          <div>
            Nested div
            <p>Nested paragraph</p>
          </div>
        </div>
        <p>Final paragraph</p>
      `

      const result = normalizeHtmlNewlines(container)
      // The exact formatting depends on whitespace handling
      expect(result).toContain("First line")
      expect(result).toContain("Nested div")
      expect(result).toContain("Nested paragraph")
      expect(result).toContain("Final paragraph")
    })
  })

  describe("extractElementContent", () => {
    it("should extract value from input elements", () => {
      const input = createMockInput("test input value")
      const result = extractElementContent(input)
      expect(result).toBe("test input value")
    })

    it("should extract value from textarea elements", () => {
      const textarea = createMockTextarea("test textarea content")
      const result = extractElementContent(textarea)
      expect(result).toBe("test textarea content")
    })

    it("should extract content from contenteditable elements", () => {
      const editable = createMockContentEditable()
      editable.innerHTML =
        "<div>Editable content</div><br><p>With formatting</p>"

      const result = extractElementContent(editable)
      expect(result).toContain("Editable content")
      expect(result).toContain("With formatting")
    })

    it("should extract textContent from regular elements", () => {
      const div = document.createElement("div")
      div.textContent = "Regular div content"

      const result = extractElementContent(div)
      expect(result).toBe("Regular div content")
    })

    it("should fallback to innerText when textContent is not available", () => {
      const span = document.createElement("span")
      // Mock a scenario where textContent is empty but innerText has content
      Object.defineProperty(span, "textContent", {
        value: "",
        configurable: true,
      })
      Object.defineProperty(span, "innerText", {
        value: "Inner text content",
        configurable: true,
      })

      const result = extractElementContent(span)
      expect(result).toBe("Inner text content")
    })

    it("should return empty string for null/undefined elements", () => {
      expect(extractElementContent(null as any)).toBe("")
      expect(extractElementContent(undefined as any)).toBe("")
    })

    it("should handle empty input elements", () => {
      const input = createMockInput("")
      const result = extractElementContent(input)
      expect(result).toBe("")
    })

    it("should handle empty textarea elements", () => {
      const textarea = createMockTextarea("")
      const result = extractElementContent(textarea)
      expect(result).toBe("")
    })

    it("should handle empty contenteditable elements", () => {
      const editable = createMockContentEditable("")
      const result = extractElementContent(editable)
      expect(result).toBe("")
    })

    it("should handle input with null value", () => {
      const input = createMockInput()
      Object.defineProperty(input, "value", { value: null, configurable: true })

      const result = extractElementContent(input)
      expect(result).toBe("")
    })

    it("should handle textarea with null value", () => {
      const textarea = createMockTextarea()
      Object.defineProperty(textarea, "value", {
        value: null,
        configurable: true,
      })

      const result = extractElementContent(textarea)
      expect(result).toBe("")
    })

    it("should handle elements with no text content", () => {
      const div = document.createElement("div")
      Object.defineProperty(div, "textContent", {
        value: null,
        configurable: true,
      })
      Object.defineProperty(div, "innerText", {
        value: null,
        configurable: true,
      })

      const result = extractElementContent(div)
      expect(result).toBe("")
    })

    it('should correctly identify contenteditable="true"', () => {
      const div = document.createElement("div")
      div.setAttribute("contenteditable", "true")
      div.innerHTML = "<div>Contenteditable content</div>"

      const result = extractElementContent(div)
      expect(result).toContain("Contenteditable content")
    })

    it('should not treat contenteditable="false" as editable', () => {
      const div = document.createElement("div")
      div.setAttribute("contenteditable", "false")
      div.textContent = "Not editable content"

      const result = extractElementContent(div)
      expect(result).toBe("Not editable content")
    })

    it("should handle case-insensitive tag names", () => {
      // Create elements with different case variations
      const input = document.createElement("INPUT") as HTMLInputElement
      input.type = "text"
      input.value = "uppercase input"

      const textarea = document.createElement("TEXTAREA") as HTMLTextAreaElement
      textarea.value = "uppercase textarea"

      expect(extractElementContent(input)).toBe("uppercase input")
      expect(extractElementContent(textarea)).toBe("uppercase textarea")
    })
  })
})
