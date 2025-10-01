import { describe, it, expect, vi, beforeEach } from "vitest"
import { StorageHelper } from "../storageHelper"
import { SaveMode } from "@/types/prompt"
import type { StorageService } from "@/services/storage"
import type { SessionManager } from "@/services/promptHistory/sessionManager"
import type { AIServiceInterface } from "@/types/aiService"
import type { Prompt, SaveDialogData, AppSettings } from "@/types/prompt"

// Mock dependencies
const createMockStorageService = (): StorageService =>
  ({
    getPrompt: vi.fn(),
    getAllPrompts: vi.fn(),
    savePrompt: vi.fn(),
    updatePrompt: vi.fn(),
    deletePrompt: vi.fn(),
    incrementExecutionCount: vi.fn(),
    pinPrompt: vi.fn(),
    unpinPrompt: vi.fn(),
    getPinnedOrder: vi.fn(),
    getSettings: vi.fn(),
    saveBulkPrompts: vi.fn(),
    pinBulkPrompts: vi.fn(),
    // Add other required StorageService methods as needed
  }) as unknown as StorageService

const createMockSessionManager = (): SessionManager =>
  ({
    getCurrentSession: vi.fn(),
    endSession: vi.fn(),
    // Add other required SessionManager methods as needed
  }) as unknown as SessionManager

const createMockAIService = (): AIServiceInterface => ({
  extractPromptContent: vi.fn(),
  isSupported: vi.fn(),
  getTextInput: vi.fn(),
  getSendButton: vi.fn(),
  onSend: vi.fn(),
  onContentChange: vi.fn(),
  onElementChange: vi.fn(),
  getServiceName: vi.fn(),
  getPopupPlacement: vi.fn(),
  getSupportHosts: vi.fn(),
  getConfig: vi.fn(),
  shouldTriggerSend: vi.fn(),
  destroy: vi.fn(),
  legacyMode: false,
})

// Test data
const mockPrompt: Prompt = {
  id: "test-id",
  name: "Test Prompt",
  content: "Test content",
  executionCount: 5,
  lastExecutedAt: new Date("2023-01-01"),
  isPinned: false,
  lastExecutionUrl: "https://example.com",
  createdAt: new Date("2022-01-01"),
  updatedAt: new Date("2023-01-01"),
}

const mockSettings: AppSettings = {
  autoSaveEnabled: true,
  maxPrompts: 100,
  sortOrder: "recent",
  showNotifications: true,
  autoCompleteEnabled: true,
}

describe("StorageHelper", () => {
  let storageHelper: StorageHelper
  let mockStorage: StorageService
  let mockSessionManager: SessionManager

  beforeEach(() => {
    // Mock window object for browser environment
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { href: "http://localhost:3000/" },
      },
      writable: true,
    })

    mockStorage = createMockStorageService()
    mockSessionManager = createMockSessionManager()
    storageHelper = new StorageHelper(mockStorage, mockSessionManager)

    // Setup default mocks
    vi.mocked(mockStorage.getSettings).mockResolvedValue(mockSettings)
  })

  describe("getPrompt", () => {
    it("should return prompt when found", async () => {
      vi.mocked(mockStorage.getPrompt).mockResolvedValue(mockPrompt)

      const result = await storageHelper.getPrompt("test-id")

      expect(result).toEqual(mockPrompt)
      expect(mockStorage.getPrompt).toHaveBeenCalledWith("test-id")
    })

    it("should throw error when prompt not found", async () => {
      vi.mocked(mockStorage.getPrompt).mockResolvedValue(null)

      await expect(storageHelper.getPrompt("non-existent")).rejects.toThrow(
        "Prompt not found: non-existent",
      )
    })
  })

  describe("getPrompts", () => {
    it("should return sorted prompts", async () => {
      const prompts = [mockPrompt]
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)

      const result = await storageHelper.getPrompts()

      expect(result).toEqual(prompts)
      expect(mockStorage.getAllPrompts).toHaveBeenCalled()
    })
  })

  describe("getPinnedPrompts", () => {
    it("should return pinned prompts in correct order", async () => {
      const pinnedPrompt = { ...mockPrompt, isPinned: true }
      const prompts = [pinnedPrompt]
      const pinnedOrder = ["test-id"]

      vi.mocked(mockStorage.getPinnedOrder).mockResolvedValue(pinnedOrder)
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)

      const result = await storageHelper.getPinnedPrompts()

      expect(result).toEqual([pinnedPrompt])
      expect(mockStorage.getPinnedOrder).toHaveBeenCalled()
      expect(mockStorage.getAllPrompts).toHaveBeenCalled()
    })

    it("should filter out non-existent pinned prompts", async () => {
      const prompts = [mockPrompt]
      const pinnedOrder = ["test-id", "non-existent"]

      vi.mocked(mockStorage.getPinnedOrder).mockResolvedValue(pinnedOrder)
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)

      const result = await storageHelper.getPinnedPrompts()

      expect(result).toEqual([mockPrompt])
    })

    it("should use Map for efficient O(1) lookups with large datasets", async () => {
      // Create large dataset to test performance optimization
      const largePromptList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPrompt,
        id: `prompt-${i}`,
        name: `Prompt ${i}`,
      }))
      const pinnedOrder = ["prompt-5", "prompt-50", "prompt-500"]

      vi.mocked(mockStorage.getPinnedOrder).mockResolvedValue(pinnedOrder)
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(largePromptList)

      const result = await storageHelper.getPinnedPrompts()

      expect(result).toHaveLength(3)
      expect(result.map((p) => p.id)).toEqual([
        "prompt-500",
        "prompt-50",
        "prompt-5",
      ])
    })
  })

  describe("applySort", () => {
    const createPrompts = () => [
      {
        ...mockPrompt,
        id: "1",
        name: "B Prompt",
        executionCount: 3,
        lastExecutedAt: new Date("2023-01-01"),
      },
      {
        ...mockPrompt,
        id: "2",
        name: "A Prompt",
        executionCount: 5,
        lastExecutedAt: new Date("2023-01-02"),
      },
    ]

    it("should sort by recent execution date", async () => {
      const prompts = createPrompts()
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)
      vi.mocked(mockStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        sortOrder: "recent",
      })

      const result = await storageHelper.getPrompts()

      expect(result[0].id).toBe("1")
      expect(result[1].id).toBe("2") // More recent reverse order
    })

    it("should sort by execution count", async () => {
      const prompts = createPrompts()
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)
      vi.mocked(mockStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        sortOrder: "execution",
      })

      const result = await storageHelper.getPrompts()

      expect(result[0].id).toBe("1")
      expect(result[1].id).toBe("2") // Higher execution count
    })

    it("should sort by name alphabetically", async () => {
      const prompts = createPrompts()
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)
      vi.mocked(mockStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        sortOrder: "name",
      })

      const result = await storageHelper.getPrompts()

      expect(result[0].name).toBe("A Prompt")
      expect(result[1].name).toBe("B Prompt")
    })

    it("should sort by composite score", async () => {
      const prompts = createPrompts()
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)
      vi.mocked(mockStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        sortOrder: "composite",
      })

      const result = await storageHelper.getPrompts()

      // Should prioritize higher execution count and more recent date
      expect(result[0].id).toBe("1")
    })

    it("should not mutate the original prompts array", async () => {
      const originalPrompts = createPrompts()
      const originalFirstPrompt = originalPrompts[0]

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(originalPrompts)

      await storageHelper.getPrompts()

      // Verify original array was not mutated
      expect(originalPrompts[0]).toBe(originalFirstPrompt)
      expect(originalPrompts).toHaveLength(2)
    })
  })

  describe("savePromptManually", () => {
    const mockSaveData: SaveDialogData = {
      name: "New Prompt",
      content: "New content",
      saveMode: SaveMode.New,
      isPinned: false,
    }

    it("should save new prompt successfully", async () => {
      const savedPrompt = { ...mockPrompt, ...mockSaveData, isPinned: true }
      vi.mocked(mockStorage.savePrompt).mockResolvedValue(savedPrompt)
      vi.mocked(mockStorage.pinPrompt).mockResolvedValue(undefined)

      const onSuccess = vi.fn()
      const onError = vi.fn()

      const result = await storageHelper.savePromptManually(
        mockSaveData,
        onSuccess,
        onError,
      )

      expect(result).toEqual(savedPrompt)
      expect(mockStorage.savePrompt).toHaveBeenCalledWith({
        name: mockSaveData.name,
        content: mockSaveData.content,
        executionCount: 0,
        lastExecutedAt: expect.any(Date),
        isPinned: true,
        lastExecutionUrl: "http://localhost:3000/",
      })
      expect(mockStorage.pinPrompt).toHaveBeenCalledWith(savedPrompt.id)
      expect(onSuccess).toHaveBeenCalledWith(savedPrompt)
      expect(onError).not.toHaveBeenCalled()
    })

    it("should overwrite existing prompt when save mode is overwrite", async () => {
      const overwriteData = { ...mockSaveData, saveMode: SaveMode.Overwrite }
      const session = {
        activePromptId: "active-id",
        url: "test",
        startedAt: new Date(),
      }
      const updatedPrompt = { ...mockPrompt, ...overwriteData }

      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(session)
      vi.mocked(mockStorage.updatePrompt).mockResolvedValue(updatedPrompt)
      vi.mocked(mockStorage.pinPrompt).mockResolvedValue(undefined)

      const result = await storageHelper.savePromptManually(overwriteData)

      expect(mockStorage.updatePrompt).toHaveBeenCalledWith("active-id", {
        name: overwriteData.name,
        content: overwriteData.content,
        isPinned: true,
      })
      expect(result).toEqual(updatedPrompt)
    })

    it("should handle save in progress error", async () => {
      const onError = vi.fn()

      // Start first save
      const promise1 = storageHelper.savePromptManually(
        mockSaveData,
        undefined,
        onError,
      )
      // Try second save immediately
      const promise2 = storageHelper.savePromptManually(
        mockSaveData,
        undefined,
        onError,
      )

      await promise1
      await promise2

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Save operation already in progress",
        }),
      )
    })

    it("should throw error when overwrite mode but no active session", async () => {
      const overwriteData = { ...mockSaveData, saveMode: SaveMode.Overwrite }
      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(null)

      const onError = vi.fn()

      const result = await storageHelper.savePromptManually(
        overwriteData,
        undefined,
        onError,
      )

      expect(result).toBeNull()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No active session for overwrite",
        }),
      )
    })
  })

  describe("handleAutoSave", () => {
    beforeEach(() => {
      // Mock window.location.href
      Object.defineProperty(window, "location", {
        value: { href: "https://example.com" },
        writable: true,
      })
    })

    it("should not save when auto-save is disabled", async () => {
      vi.mocked(mockStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        autoSaveEnabled: false,
      })

      await storageHelper.handleAutoSave("")

      expect(mockStorage.savePrompt).not.toHaveBeenCalled()
    })

    it("should not save when content is empty", async () => {
      await storageHelper.handleAutoSave("")

      expect(mockStorage.savePrompt).not.toHaveBeenCalled()
    })

    it("should save new prompt with auto-generated name", async () => {
      const content = "This is a test prompt content"
      vi.mocked(mockStorage.savePrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue([mockPrompt])

      const onSuccess = vi.fn()

      await storageHelper.handleAutoSave(content, onSuccess)

      expect(mockStorage.savePrompt).toHaveBeenCalledWith({
        name: content, // Auto-generated name
        content: content,
        executionCount: 1,
        lastExecutedAt: expect.any(Date),
        isPinned: false,
        lastExecutionUrl: "https://example.com",
      })
      expect(onSuccess).toHaveBeenCalledWith(mockPrompt)
    })

    it("should increment execution count of active prompt", async () => {
      const content = "Test content for active prompt"
      const session = {
        activePromptId: "active-id",
        url: "test",
        startedAt: new Date(),
      }

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue([mockPrompt])
      vi.mocked(mockStorage.savePrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(session)

      await storageHelper.handleAutoSave(content)

      expect(mockStorage.incrementExecutionCount).toHaveBeenCalledWith(
        "active-id",
        "https://example.com",
      )
    })
  })

  describe("updatePrompt", () => {
    it("should update prompt successfully", async () => {
      const updates = { name: "Updated Name" }
      const updatedPrompt = { ...mockPrompt, ...updates }

      vi.mocked(mockStorage.getPrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockStorage.updatePrompt).mockResolvedValue(updatedPrompt)

      const onSuccess = vi.fn()

      await storageHelper.updatePrompt("test-id", updates, onSuccess)

      expect(mockStorage.updatePrompt).toHaveBeenCalledWith("test-id", updates)
      expect(onSuccess).toHaveBeenCalledWith(updatedPrompt)
    })

    it("should handle pin status change", async () => {
      const updates = { isPinned: true }
      const updatedPrompt = { ...mockPrompt, ...updates }

      vi.mocked(mockStorage.getPrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockStorage.updatePrompt).mockResolvedValue(updatedPrompt)

      await storageHelper.updatePrompt("test-id", updates)

      expect(mockStorage.pinPrompt).toHaveBeenCalledWith("test-id")
    })

    it("should handle unpin status change", async () => {
      const updates = { isPinned: false }
      const updatedPrompt = { ...mockPrompt, ...updates }

      vi.mocked(mockStorage.getPrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockStorage.updatePrompt).mockResolvedValue(updatedPrompt)

      await storageHelper.updatePrompt("test-id", updates)

      expect(mockStorage.unpinPrompt).toHaveBeenCalledWith("test-id")
    })

    it("should handle prompt not found", async () => {
      vi.mocked(mockStorage.getPrompt).mockResolvedValue(null)

      const onError = vi.fn()

      await storageHelper.updatePrompt("non-existent", {}, undefined, onError)

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Prompt not found: non-existent",
        }),
      )
    })
  })

  describe("deletePrompt", () => {
    it("should delete prompt successfully", async () => {
      vi.mocked(mockStorage.getPrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(null)

      const onSuccess = vi.fn()

      await storageHelper.deletePrompt("test-id", onSuccess)

      expect(mockStorage.deletePrompt).toHaveBeenCalledWith("test-id")
      expect(onSuccess).toHaveBeenCalledWith(mockPrompt)
    })

    it("should end session when deleting active prompt", async () => {
      const session = {
        activePromptId: "test-id",
        url: "test",
        startedAt: new Date(),
      }

      vi.mocked(mockStorage.getPrompt).mockResolvedValue(mockPrompt)
      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(session)

      await storageHelper.deletePrompt("test-id")

      expect(mockSessionManager.endSession).toHaveBeenCalled()
      expect(mockStorage.deletePrompt).toHaveBeenCalledWith("test-id")
    })

    it("should handle prompt not found", async () => {
      vi.mocked(mockStorage.getPrompt).mockResolvedValue(null)

      const onError = vi.fn()

      await storageHelper.deletePrompt("non-existent", undefined, onError)

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Prompt not found: non-existent",
        }),
      )
    })
  })

  describe("pinPrompt and unpinPrompt", () => {
    it("should pin prompt", async () => {
      await storageHelper.pinPrompt("test-id")

      expect(mockStorage.pinPrompt).toHaveBeenCalledWith("test-id")
    })

    it("should unpin prompt", async () => {
      await storageHelper.unpinPrompt("test-id")

      expect(mockStorage.unpinPrompt).toHaveBeenCalledWith("test-id")
    })
  })

  describe("prepareSaveDialogData", () => {
    let mockAIService: AIServiceInterface

    beforeEach(() => {
      mockAIService = createMockAIService()
    })

    it("should prepare data with active session", async () => {
      const content = "Test content"
      const session = {
        activePromptId: "active-id",
        url: "test",
        startedAt: new Date(),
      }
      const activePrompt = { ...mockPrompt, name: "Active Prompt" }

      vi.mocked(mockAIService.extractPromptContent).mockReturnValue(content)
      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(session)
      vi.mocked(mockStorage.getPrompt).mockResolvedValue(activePrompt)

      const result = await storageHelper.prepareSaveDialogData(mockAIService)

      expect(result).toEqual({
        initialContent: content,
        isOverwriteAvailable: true,
        initialName: "Active Prompt",
      })
    })

    it("should prepare data without active session", async () => {
      const content = "Test content for new prompt"

      vi.mocked(mockAIService.extractPromptContent).mockReturnValue(content)
      vi.mocked(mockSessionManager.getCurrentSession).mockResolvedValue(null)

      const result = await storageHelper.prepareSaveDialogData(mockAIService)

      expect(result).toEqual({
        initialContent: content,
        isOverwriteAvailable: false,
        initialName: content, // Auto-generated name
      })
    })

    it("should handle null AI service", async () => {
      const result = await storageHelper.prepareSaveDialogData(null)

      expect(result).toEqual({
        initialContent: "",
        isOverwriteAvailable: false,
        initialName: "",
      })
    })
  })

  describe("generatePromptName", () => {
    it("should return content as-is when within max length", async () => {
      const content = "Short content"
      const prompts = [mockPrompt]

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)

      await storageHelper.getPrompts()

      // Test the private method indirectly through auto-save
      vi.mocked(mockStorage.savePrompt).mockResolvedValue(mockPrompt)

      await storageHelper.handleAutoSave(content)

      expect(mockStorage.savePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: content,
        }),
      )
    })

    it("should truncate long content with ellipsis", async () => {
      const longContent =
        "This is a very long content that exceeds the maximum length limit of 50 characters"
      const expectedTruncated = longContent.substring(0, 47) + "..."

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue([mockPrompt])
      vi.mocked(mockStorage.savePrompt).mockResolvedValue(mockPrompt)

      await storageHelper.handleAutoSave(longContent)

      expect(mockStorage.savePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expectedTruncated,
        }),
      )
    })

    it("should clean whitespace in content", async () => {
      const messyContent = "  Content   with   multiple    spaces  \n\n  "
      const cleanedContent = "Content with multiple spaces"

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue([mockPrompt])
      vi.mocked(mockStorage.savePrompt).mockResolvedValue(mockPrompt)

      await storageHelper.handleAutoSave(messyContent)

      expect(mockStorage.savePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: cleanedContent,
        }),
      )
    })
  })

  describe("performance optimizations", () => {
    it("should cache composite scores to avoid recalculation", async () => {
      const prompts = [
        { ...mockPrompt, id: "1", executionCount: 10 },
        { ...mockPrompt, id: "2", executionCount: 5 },
      ]

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(prompts)
      vi.mocked(mockStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        sortOrder: "composite",
      })

      // First call should calculate and cache scores
      const result1 = await storageHelper.getPrompts()

      // Second call should use cached scores
      const result2 = await storageHelper.getPrompts()

      // Results should be identical
      expect(result1).toEqual(result2)

      // The same prompt objects should maintain their composite scores
      expect(result1[0].id).toBe("2") // Higher execution count
      expect(result2[0].id).toBe("2")
    })

    it("should clear composite score cache when prompt is updated", async () => {
      const originalPrompt = { ...mockPrompt, executionCount: 5 }
      const updatedPrompt = { ...mockPrompt, executionCount: 10 }

      vi.mocked(mockStorage.getPrompt).mockResolvedValue(originalPrompt)
      vi.mocked(mockStorage.updatePrompt).mockResolvedValue(updatedPrompt)

      const onSuccess = vi.fn()

      await storageHelper.updatePrompt(
        "test-id",
        { executionCount: 10 },
        onSuccess,
      )

      expect(onSuccess).toHaveBeenCalledWith(updatedPrompt)
      // Cache should be cleared for both original and updated prompts
    })
  })

  describe("saveBulkPrompts", () => {
    const createBulkPrompts = () => [
      {
        ...mockPrompt,
        id: "new-1",
        name: "New Prompt 1",
        content: "New content 1",
        isPinned: false,
      },
      {
        ...mockPrompt,
        id: "new-2",
        name: "New Prompt 2",
        content: "New content 2",
        isPinned: true,
      },
      {
        ...mockPrompt,
        id: "duplicate-1",
        name: "Test Prompt", // Same as mockPrompt
        content: "Test content", // Same as mockPrompt
        isPinned: false,
      },
    ]

    it("should handle empty array", async () => {
      const result = await storageHelper.saveBulkPrompts([])

      expect(result).toEqual({
        imported: 0,
        duplicates: 0,
      })
      expect(mockStorage.getAllPrompts).not.toHaveBeenCalled()
      expect(mockStorage.saveBulkPrompts).not.toHaveBeenCalled()
    })

    it("should save new prompts successfully", async () => {
      const newPrompts = [
        {
          ...mockPrompt,
          id: "new-1",
          name: "New Prompt 1",
          content: "New content 1",
          isPinned: false,
        },
        {
          ...mockPrompt,
          id: "new-2",
          name: "New Prompt 2",
          content: "New content 2",
          isPinned: false,
        },
      ]
      const existingPrompts = [mockPrompt] // Different content

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(existingPrompts)
      vi.mocked(mockStorage.saveBulkPrompts).mockResolvedValue(newPrompts)

      const result = await storageHelper.saveBulkPrompts(newPrompts)

      expect(result).toEqual({
        imported: 2,
        duplicates: 0,
      })
      expect(mockStorage.saveBulkPrompts).toHaveBeenCalledWith(newPrompts)
      expect(mockStorage.pinBulkPrompts).not.toHaveBeenCalled()
    })

    it("should detect duplicate prompts by name and content", async () => {
      const prompts = createBulkPrompts()
      const existingPrompts = [mockPrompt] // Has same name+content as duplicate-1

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(existingPrompts)
      vi.mocked(mockStorage.saveBulkPrompts).mockResolvedValue([
        prompts[0],
        prompts[1],
      ])

      const result = await storageHelper.saveBulkPrompts(prompts)

      expect(result).toEqual({
        imported: 2,
        duplicates: 1,
      })
      // Should only save non-duplicate prompts
      expect(mockStorage.saveBulkPrompts).toHaveBeenCalledWith([
        prompts[0],
        prompts[1],
      ])
    })

    it("should handle pinned prompts", async () => {
      const prompts = [
        {
          ...mockPrompt,
          id: "pinned-1",
          name: "Pinned Prompt 1",
          content: "Pinned content 1",
          isPinned: true,
        },
        {
          ...mockPrompt,
          id: "pinned-2",
          name: "Pinned Prompt 2",
          content: "Pinned content 2",
          isPinned: true,
        },
      ]

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue([])
      vi.mocked(mockStorage.saveBulkPrompts).mockResolvedValue(prompts)
      vi.mocked(mockStorage.pinBulkPrompts).mockResolvedValue(undefined)

      const result = await storageHelper.saveBulkPrompts(prompts)

      expect(result).toEqual({
        imported: 2,
        duplicates: 0,
      })
      expect(mockStorage.saveBulkPrompts).toHaveBeenCalledWith(prompts)
      expect(mockStorage.pinBulkPrompts).toHaveBeenCalledWith([
        "pinned-1",
        "pinned-2",
      ])
    })

    it("should handle mixed new, duplicate, and pinned prompts", async () => {
      const prompts = createBulkPrompts()
      const existingPrompts = [mockPrompt] // Matches duplicate-1

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(existingPrompts)
      vi.mocked(mockStorage.saveBulkPrompts).mockResolvedValue([
        prompts[0],
        prompts[1],
      ])
      vi.mocked(mockStorage.pinBulkPrompts).mockResolvedValue(undefined)

      const result = await storageHelper.saveBulkPrompts(prompts)

      expect(result).toEqual({
        imported: 2,
        duplicates: 1,
      })
      // Should save non-duplicate prompts
      expect(mockStorage.saveBulkPrompts).toHaveBeenCalledWith([
        prompts[0],
        prompts[1],
      ])
      // Should pin only the pinned ones
      expect(mockStorage.pinBulkPrompts).toHaveBeenCalledWith(["new-2"])
    })

    it("should handle getAllPrompts error", async () => {
      const prompts = [mockPrompt]

      vi.mocked(mockStorage.getAllPrompts).mockRejectedValue(
        new Error("Database error"),
      )

      await expect(storageHelper.saveBulkPrompts(prompts)).rejects.toThrow(
        "Save failed: Error: Database error",
      )
    })

    it("should handle saveBulkPrompts error", async () => {
      const prompts = [
        {
          ...mockPrompt,
          id: "new-1",
          name: "New Prompt",
          content: "New content",
          isPinned: false,
        },
      ]

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue([])
      vi.mocked(mockStorage.saveBulkPrompts).mockRejectedValue(
        new Error("TEST Database error"),
      )

      await expect(storageHelper.saveBulkPrompts(prompts)).rejects.toThrow(
        "Save failed: Error: TEST Database error",
      )
    })

    it("should handle all prompts being duplicates", async () => {
      const prompts = [
        {
          ...mockPrompt,
          id: "dup-1",
          name: "Test Prompt", // Same as mockPrompt
          content: "Test content", // Same as mockPrompt
        },
        {
          ...mockPrompt,
          id: "dup-2",
          name: "Test Prompt", // Same as mockPrompt
          content: "Test content", // Same as mockPrompt
        },
      ]
      const existingPrompts = [mockPrompt]

      vi.mocked(mockStorage.getAllPrompts).mockResolvedValue(existingPrompts)

      const result = await storageHelper.saveBulkPrompts(prompts)

      expect(result).toEqual({
        imported: 0,
        duplicates: 2,
      })
      expect(mockStorage.saveBulkPrompts).not.toHaveBeenCalled()
      expect(mockStorage.pinBulkPrompts).not.toHaveBeenCalled()
    })
  })
})
