import { describe, it, expect, vi, beforeEach } from "vitest"
import { AutoCompleteManager } from "../../autoComplete/autoCompleteManager"
import type { Prompt } from "../../../types/prompt"
import type { AutoCompleteCallbacks } from "../../autoComplete/types"

// Mock the dom module
vi.mock("../../dom", () => ({
  getCaretPosition: vi.fn(),
}))

// Mock data
const mockPrompts: Prompt[] = [
  {
    id: "1",
    name: "Hello World",
    content: "This is a hello world prompt",
    executionCount: 0,
    lastExecutedAt: new Date(),
    isPinned: false,
    lastExecutionUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Test Prompt",
    content: "This is a test prompt for autocomplete",
    executionCount: 0,
    lastExecutedAt: new Date(),
    isPinned: false,
    lastExecutionUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "JavaScript Tips",
    content: "Useful JavaScript coding tips and tricks",
    executionCount: 0,
    lastExecutedAt: new Date(),
    isPinned: false,
    lastExecutionUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    name: "hello-world-special",
    content: "Special hello world with hyphens",
    executionCount: 0,
    lastExecutedAt: new Date(),
    isPinned: false,
    lastExecutionUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    name: "Python Guide",
    content: "Comprehensive Python programming guide",
    executionCount: 0,
    lastExecutedAt: new Date(),
    isPinned: false,
    lastExecutionUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe("AutoCompleteManager", () => {
  let manager: AutoCompleteManager
  let mockCallbacks: AutoCompleteCallbacks
  let mockElement: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock callbacks
    mockCallbacks = {
      onShow: vi.fn(),
      onHide: vi.fn(),
      onSelect: vi.fn(),
    }

    // Create mock element (simplified for Node.js)
    mockElement = {
      getAttribute: vi.fn().mockReturnValue("true"),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        bottom: 20,
        right: 100,
      }),
    }

    // Create manager instance
    manager = new AutoCompleteManager(mockCallbacks)
    manager.setElement(mockElement)
    manager.setPrompts(mockPrompts)
  })

  describe("findMatches", () => {
    it("should find matches for basic text input", () => {
      // We need to access the private method for testing
      // This is a workaround for testing private methods
      const managerAny = manager as any

      const input = "hello"
      const caretPos = 5
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(2)
      expect(matches[0].name).toBe("Hello World")
      expect(matches[1].name).toBe("hello-world-special")
      expect(matches[0].matchStart).toBe(0)
      expect(matches[0].matchEnd).toBe(5)
    })

    it("should be case-insensitive", () => {
      const managerAny = manager as any

      const input = "HELLO"
      const caretPos = 5
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(2)
      expect(matches[0].name).toBe("Hello World")
      expect(matches[1].name).toBe("hello-world-special")
    })

    it("should handle partial matches", () => {
      const managerAny = manager as any

      const input = "test"
      const caretPos = 4
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("Test Prompt")
    })

    it("should respect minimum search length", () => {
      const managerAny = manager as any

      // Characters below minSearchLength should not match (minSearchLength = 3)
      let input = "h"
      let caretPos = 1
      let matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)

      // 2 characters should not match
      input = "he"
      caretPos = 2
      matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)
    })

    it("should require minimum 3 characters for matching", () => {
      const managerAny = manager as any

      // 1 character should not match
      let input = "h"
      let caretPos = 1
      let matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)

      // 2 characters should not match
      input = "he"
      caretPos = 2
      matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)

      // 3 characters should match
      input = "hel"
      caretPos = 3
      matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(2) // "Hello World" and "hello-world-special"
    })

    it("should respect maximum matches limit", () => {
      // Create manager with maxMatches = 1
      const limitedManager = new AutoCompleteManager(mockCallbacks, {
        maxMatches: 1,
      })
      limitedManager.setPrompts(mockPrompts)
      const limitedManagerAny = limitedManager as any

      const input = "hello"
      const caretPos = 5
      const matches = limitedManagerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
    })

    it("should handle word boundaries correctly", () => {
      const managerAny = manager as any

      // Test with text before the search term
      const input = "This is hello"
      const caretPos = 13
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(2)
      expect(matches[0].matchStart).toBe(8) // Start of "hello"
      expect(matches[0].matchEnd).toBe(13) // End of "hello"
    })

    it("should return empty array for no matches", () => {
      const managerAny = manager as any

      const input = "nonexistent"
      const caretPos = 11
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should handle empty input", () => {
      const managerAny = manager as any

      const input = ""
      const caretPos = 0
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should handle caret position at the beginning", () => {
      const managerAny = manager as any

      const input = "hello world"
      const caretPos = 0
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should handle special characters in search term", () => {
      const managerAny = manager as any

      const input = "hello-"
      const caretPos = 6
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("hello-world-special")
    })

    it("should handle Unicode characters", () => {
      const managerAny = manager as any

      // Add a prompt with Unicode characters
      const unicodePrompts = [
        ...mockPrompts,
        {
          id: "unicode",
          name: "日本語テスト",
          content: "Japanese test prompt",
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: false,
          lastExecutionUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      manager.setPrompts(unicodePrompts)

      const input = "日本語"
      const caretPos = 3
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("日本語テスト")
    })

    it("should handle whitespace-only input", () => {
      const managerAny = manager as any

      const input = "   "
      const caretPos = 3
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should match prompts with different cases in name", () => {
      const managerAny = manager as any

      // Test case sensitivity
      const input = "javascript"
      const caretPos = 10
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("JavaScript Tips")
    })

    it("should handle multiple words and match the last word", () => {
      const managerAny = manager as any

      const input = "I need some test"
      const caretPos = 16
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("Test Prompt")
      expect(matches[0].matchStart).toBe(12) // Start of "test"
      expect(matches[0].matchEnd).toBe(16) // End of "test"
    })
  })

  describe("AutoCompleteManager integration", () => {
    it("should handle content change and trigger callbacks", async () => {
      // Mock getCaretPosition to return a specific position
      const { getCaretPosition } = await import("../../dom")
      vi.mocked(getCaretPosition).mockReturnValue(5)

      // Trigger content change
      manager.handleContentChange("hello")

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(mockCallbacks.onShow).toHaveBeenCalled()
    })

    it("should hide autocomplete when no matches found", async () => {
      const { getCaretPosition } = await import("../../dom")
      vi.mocked(getCaretPosition).mockReturnValue(11)

      // First, show autocomplete to ensure it's visible
      vi.mocked(getCaretPosition).mockReturnValue(5)
      manager.handleContentChange("hello")
      await new Promise((resolve) => setTimeout(resolve, 250))

      // Then test hiding with no matches
      vi.mocked(getCaretPosition).mockReturnValue(11)
      manager.handleContentChange("nonexistent")

      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(mockCallbacks.onHide).toHaveBeenCalled()
    })

    it("should handle element not set", async () => {
      const { getCaretPosition } = await import("../../dom")
      vi.mocked(getCaretPosition).mockReturnValue(5)

      // First, show autocomplete to ensure it's visible
      manager.handleContentChange("hello")
      await new Promise((resolve) => setTimeout(resolve, 250))

      // Then set element to null and test
      manager.setElement(null)
      manager.handleContentChange("hello")

      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(mockCallbacks.onHide).toHaveBeenCalled()
    })
  })
})
