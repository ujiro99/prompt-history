import { describe, it, expect, vi, beforeEach } from "vitest"
import { AutoCompleteManager } from "../../autoComplete/autoCompleteManager"
import type { Prompt } from "../../../types/prompt"
import type {
  AutoCompleteCallbacks,
  AutoCompleteMatch,
} from "../../autoComplete/types"

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
      onExecute: vi.fn(),
      onSelectChange: vi.fn(),
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
    manager = new AutoCompleteManager()
    manager.setElement(mockElement)
    manager.setPrompts(mockPrompts)
  })

  describe("findMatches", () => {
    it("should find matches for basic text input", () => {
      // We need to access the private method for testing
      // This is a workaround for testing private methods
      const managerAny = manager as any

      const input = "hello"
      const caretPos = { position: 5, newlineCount: 0 }
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
      const caretPos = { position: 5, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(2)
      expect(matches[0].name).toBe("Hello World")
      expect(matches[1].name).toBe("hello-world-special")
    })

    it("should handle partial matches", () => {
      const managerAny = manager as any

      const input = "test"
      const caretPos = { position: 4, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("Test Prompt")
    })

    it("should respect minimum search length", () => {
      const managerAny = manager as any

      // Characters below minSearchLength should not match (minSearchLength = 3)
      let input = "h"
      let caretPos = { position: 1, newlineCount: 0 }
      let matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)

      // 2 characters should not match
      input = "he"
      caretPos = { position: 2, newlineCount: 0 }
      matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)
    })

    it("should require minimum 3 characters for matching", () => {
      const managerAny = manager as any

      // 1 character should not match
      let input = "h"
      let caretPos = { position: 1, newlineCount: 0 }
      let matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)

      // 2 characters should not match
      input = "he"
      caretPos = { position: 2, newlineCount: 0 }
      matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(0)

      // 3 characters should match
      input = "hel"
      caretPos = { position: 3, newlineCount: 0 }
      matches = managerAny.findMatches(input, caretPos)
      expect(matches).toHaveLength(2) // "Hello World" and "hello-world-special"
    })

    it("should respect maximum matches limit", () => {
      // Create manager with maxMatches = 1
      const limitedManager = new AutoCompleteManager({
        maxMatches: 1,
      })
      limitedManager.setPrompts(mockPrompts)
      const limitedManagerAny = limitedManager as any

      const input = "hello"
      const caretPos = { position: 5, newlineCount: 0 }
      const matches = limitedManagerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
    })

    it("should handle word boundaries correctly", () => {
      const managerAny = manager as any

      // Test with text before the search term
      const input = "This is hello"
      const caretPos = { position: 13, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(2)
      expect(matches[0].matchStart).toBe(8) // Start of "hello"
      expect(matches[0].matchEnd).toBe(13) // End of "hello"
    })

    it("should return empty array for no matches", () => {
      const managerAny = manager as any

      const input = "nonexistent"
      const caretPos = { position: 11, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should handle empty input", () => {
      const managerAny = manager as any

      const input = ""
      const caretPos = { position: 0, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should handle caret position at the beginning", () => {
      const managerAny = manager as any

      const input = "hello world"
      const caretPos = { position: 0, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should handle special characters in search term", () => {
      const managerAny = manager as any

      const input = "hello-"
      const caretPos = { position: 6, newlineCount: 0 }
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
      const caretPos = { position: 3, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("日本語テスト")
    })

    it("should handle whitespace-only input", () => {
      const managerAny = manager as any

      const input = "   "
      const caretPos = { position: 3, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)
    })

    it("should match prompts with different cases in name", () => {
      const managerAny = manager as any

      // Test case sensitivity
      const input = "javascript"
      const caretPos = { position: 10, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("JavaScript Tips")
    })

    it("should handle multiple words and match the last word", () => {
      const managerAny = manager as any

      const input = "I need some test"
      const caretPos = { position: 16, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe("Test Prompt")
      expect(matches[0].matchStart).toBe(12) // Start of "test"
      expect(matches[0].matchEnd).toBe(16) // End of "test"
    })

    it("should match 2-word combinations", () => {
      const managerAny = manager as any

      // Test "hello world" matching "Hello World"
      let input = "Type hello world"
      let caretPos = { position: 16, newlineCount: 0 }
      let matches = managerAny.findMatches(input, caretPos)

      expect(matches.length).toBeGreaterThanOrEqual(1)
      // First match should be the 2-word match
      expect(matches[0].name).toBe("Hello World")
      expect(matches[0].matchStart).toBe(5) // Start of "hello world"
      expect(matches[0].matchEnd).toBe(16) // End of "hello world"
      expect(matches[0].searchTerm).toBe("hello world")

      // Test "test prompt" matching "Test Prompt"
      input = "Run test prompt"
      caretPos = { position: 15, newlineCount: 0 }
      matches = managerAny.findMatches(input, caretPos)

      expect(matches.length).toBeGreaterThanOrEqual(1)
      // First match should be the 2-word match
      expect(matches[0].name).toBe("Test Prompt")
      expect(matches[0].matchStart).toBe(4) // Start of "test prompt"
      expect(matches[0].matchEnd).toBe(15) // End of "test prompt"
      expect(matches[0].searchTerm).toBe("test prompt")
    })

    it("should match 3-word combinations with case insensitivity", () => {
      const managerAny = manager as any

      // Add a 3-word prompt for testing
      const threeWordPrompts = [
        ...mockPrompts,
        {
          id: "3word",
          name: "Python Programming Guide",
          content: "A comprehensive guide for Python programming",
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: false,
          lastExecutionUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      manager.setPrompts(threeWordPrompts)

      const input = "Use python programming guide"
      const caretPos = { position: input.length, newlineCount: 0 } // Use full length: 28
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches.length).toBeGreaterThanOrEqual(1)
      // First match should be the 3-word match (highest priority)
      expect(matches[0].name).toBe("Python Programming Guide")
      expect(matches[0].matchStart).toBe(4) // Start of "python programming guide"
      expect(matches[0].matchEnd).toBe(28) // End of "python programming guide"
      expect(matches[0].searchTerm).toBe("python programming guide")
    })

    it("should prioritize longer matches over shorter ones", () => {
      const managerAny = manager as any

      // Add prompts that would match both single and multi-word searches
      const priorityPrompts = [
        ...mockPrompts,
        {
          id: "world-single",
          name: "World",
          content: "Single word world prompt",
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: false,
          lastExecutionUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      manager.setPrompts(priorityPrompts)

      // Should find both matches but prioritize "Hello World" (2 words) over "World" (1 word)
      const input = "Say hello world"
      const caretPos = { position: 15, newlineCount: 0 }
      const matches: AutoCompleteMatch[] = managerAny.findMatches(
        input,
        caretPos,
      )

      expect(matches.length).toBeGreaterThanOrEqual(2)
      // First match should be the 2-word match "Hello World"
      expect(matches[0].name).toBe("Hello World")
      expect(matches[0].searchTerm).toBe("hello world")

      // Find the "World" match among the results (it might not be at index 1 due to alphabetical sorting)
      const worldMatch = matches.find((m) => m.name === "World")
      expect(worldMatch).toBeDefined()
      expect(worldMatch?.searchTerm).toBe("world")
    })

    it("should handle spacing variations in multi-word input", () => {
      const managerAny = manager as any

      // Test with multiple spaces - should fall back to single word match since double space won't match single space in prompt names
      let input = "Type hello  world"
      let caretPos = { position: 17, newlineCount: 0 }
      let matches = managerAny.findMatches(input, caretPos)

      // This should fall back to matching "world" (single word) since "hello  world" won't match "Hello World"
      expect(matches).toHaveLength(2) // "Hello World" and "hello-world-special" contain "world"
      expect(matches[0].name).toBe("Hello World")
      expect(matches[0].searchTerm).toBe("world") // Falls back to single word

      // Test with single space - should match the 2-word pattern
      input = "Type hello world"
      caretPos = { position: 16, newlineCount: 0 }
      matches = managerAny.findMatches(input, caretPos)

      expect(matches.length).toBeGreaterThanOrEqual(1)
      // First match should be the 2-word pattern
      expect(matches[0].name).toBe("Hello World")
      expect(matches[0].searchTerm).toBe("hello world")
    })

    it("should respect minimum character requirement for multi-word matches", () => {
      const managerAny = manager as any

      // 2 words but total less than 3 characters should not match
      let input = "a b"
      let caretPos = { position: 3, newlineCount: 0 }
      let matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0)

      // 2 words with exactly 3 characters should match if there's a matching prompt
      input = "a bc"
      caretPos = { position: 4, newlineCount: 0 }
      matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(0) // No prompt matches "a bc"
    })

    it("should include both short and long matches when available", () => {
      const managerAny = manager as any

      // "nonexistent hello" should find both 2-word and 1-word matches
      const input = "Type nonexistent hello"
      const caretPos = { position: 22, newlineCount: 0 }
      const matches = managerAny.findMatches(input, caretPos)

      expect(matches).toHaveLength(2)
      expect(matches[0].name).toBe("Hello World")
      expect(matches[1].name).toBe("hello-world-special")
      // Both should be single word matches since "nonexistent hello" doesn't match any 2-word prompts
      expect(matches[0].searchTerm).toBe("hello")
      expect(matches[1].searchTerm).toBe("hello")
    })

    it("should show matches from multiple word counts up to maxMatches limit", () => {
      const managerAny = manager as any

      // Add more prompts to test multiple word count matches
      const multiPrompts = [
        ...mockPrompts,
        {
          id: "hello-single",
          name: "Hello",
          content: "Single hello prompt",
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: false,
          lastExecutionUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "world-single",
          name: "World",
          content: "Single world prompt",
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: false,
          lastExecutionUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      manager.setPrompts(multiPrompts)

      const input = "Type hello world"
      const caretPos = { position: 16, newlineCount: 0 }
      const matches: AutoCompleteMatch[] = managerAny.findMatches(
        input,
        caretPos,
      )

      // Should include matches from different word counts but respect maxMatches (5)
      expect(matches.length).toBeLessThanOrEqual(5)

      // First match should be the 2-word match
      expect(matches[0].name).toBe("Hello World")
      expect(matches[0].searchTerm).toBe("hello world")

      // Should also include single word matches for "world" (since "Hello" doesn't contain "hello world")
      const matchNames = matches.map((m) => m.name)
      expect(matchNames).toContain("World") // "World" contains "world"
      expect(matchNames).toContain("hello-world-special") // Contains "hello" in single word search

      // Log matches for debugging
      console.log(
        "All matches:",
        matches.map((m) => ({ name: m.name, searchTerm: m.searchTerm })),
      )
    })
  })

  describe("AutoCompleteManager integration", () => {
    it("should handle content change and trigger callbacks", async () => {
      // Mock getCaretPosition to return a specific position
      const { getCaretPosition } = await import("../../dom")
      vi.mocked(getCaretPosition).mockReturnValue({
        position: 5,
        newlineCount: 0,
      })

      // Trigger content change
      manager.setCallbacks(mockCallbacks)
      manager.handleContentChange("hello")

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockCallbacks.onShow).toHaveBeenCalled()
    })

    it("should hide autocomplete when no matches found", async () => {
      const { getCaretPosition } = await import("../../dom")
      vi.mocked(getCaretPosition).mockReturnValue({
        position: 11,
        newlineCount: 0,
      })

      // First, show autocomplete to ensure it's visible
      vi.mocked(getCaretPosition).mockReturnValue({
        position: 5,
        newlineCount: 0,
      })
      manager.setCallbacks(mockCallbacks)
      manager.handleContentChange("hello")
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Then test hiding with no matches
      vi.mocked(getCaretPosition).mockReturnValue({
        position: 11,
        newlineCount: 0,
      })
      manager.handleContentChange("nonexistent")

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(mockCallbacks.onHide).toHaveBeenCalled()
    })

    it("should handle element not set", async () => {
      const { getCaretPosition } = await import("../../dom")
      vi.mocked(getCaretPosition).mockReturnValue({
        position: 5,
        newlineCount: 0,
      })

      // First, show autocomplete to ensure it's visible
      manager.setCallbacks(mockCallbacks)
      manager.handleContentChange("hello")
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Then set element to null and test
      manager.setElement(null)
      manager.handleContentChange("hello")

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockCallbacks.onHide).toHaveBeenCalled()
    })
  })
})
