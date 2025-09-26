import { describe, it, expect, beforeEach, vi } from "vitest"
import { StorageService } from "../index"
import { promptsService } from "../prompts"
import { sessionsService } from "../sessions"
import { pinsService } from "../pins"
import { settingsService } from "../settings"
import { aiConfigCacheService } from "../aiConfigCache"
import type { Prompt, AppSettings, Session } from "@/types/prompt"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

// Mock all service dependencies
vi.mock("../prompts", () => ({
  promptsService: {
    savePrompt: vi.fn(),
    updatePrompt: vi.fn(),
    deletePrompt: vi.fn(),
    getPrompt: vi.fn(),
    getAllPrompts: vi.fn(),
    incrementExecutionCount: vi.fn(),
    watchPrompts: vi.fn(),
    clearPrompts: vi.fn(),
  },
}))

vi.mock("../sessions", () => ({
  sessionsService: {
    startSession: vi.fn(),
    endSession: vi.fn(),
    getCurrentSession: vi.fn(),
    hasActiveSession: vi.fn(),
    clearSessions: vi.fn(),
  },
}))

vi.mock("../pins", () => ({
  pinsService: {
    pinPrompt: vi.fn(),
    unpinPrompt: vi.fn(),
    getPinnedOrder: vi.fn(),
    updatePinnedOrder: vi.fn(),
    watchPinnedOrder: vi.fn(),
    cleanupPinnedOrder: vi.fn(),
    clearPins: vi.fn(),
  },
}))

vi.mock("../settings", () => ({
  settingsService: {
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    watchSettings: vi.fn(),
    clearSettings: vi.fn(),
  },
}))

vi.mock("../aiConfigCache", () => ({
  aiConfigCacheService: {
    getTodaysCache: vi.fn(),
    saveCache: vi.fn(),
    getLatestCache: vi.fn(),
  },
}))

describe("StorageService", () => {
  let storageService: StorageService

  beforeEach(() => {
    storageService = StorageService.getInstance()
    vi.clearAllMocks()
  })

  describe("Singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = StorageService.getInstance()
      const instance2 = StorageService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe("Prompt operations", () => {
    const mockPrompt: Prompt = {
      id: "test-id",
      name: "Test Prompt",
      content: "Test content",
      executionCount: 0,
      lastExecutedAt: new Date(),
      isPinned: false,
      lastExecutionUrl: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockPromptInput: Omit<Prompt, "id" | "createdAt" | "updatedAt"> = {
      name: "Test Prompt",
      content: "Test content",
      executionCount: 0,
      lastExecutedAt: new Date(),
      isPinned: false,
      lastExecutionUrl: "",
    }

    describe("savePrompt", () => {
      it("should call promptsService.savePrompt", async () => {
        vi.mocked(promptsService.savePrompt).mockResolvedValue(mockPrompt)

        const result = await storageService.savePrompt(mockPromptInput)

        expect(promptsService.savePrompt).toHaveBeenCalledWith(mockPromptInput)
        expect(result).toBe(mockPrompt)
      })
    })

    describe("updatePrompt", () => {
      it("should call promptsService.updatePrompt", async () => {
        const updates = { name: "Updated name" }
        vi.mocked(promptsService.updatePrompt).mockResolvedValue(mockPrompt)

        const result = await storageService.updatePrompt("test-id", updates)

        expect(promptsService.updatePrompt).toHaveBeenCalledWith(
          "test-id",
          updates,
        )
        expect(result).toBe(mockPrompt)
      })
    })

    describe("deletePrompt", () => {
      it("should call promptsService.deletePrompt and pinsService.cleanupPinnedOrder", async () => {
        vi.mocked(promptsService.deletePrompt).mockResolvedValue()
        vi.mocked(pinsService.cleanupPinnedOrder).mockResolvedValue()

        await storageService.deletePrompt("test-id")

        expect(promptsService.deletePrompt).toHaveBeenCalledWith("test-id")
        expect(pinsService.cleanupPinnedOrder).toHaveBeenCalledWith("test-id")
      })
    })

    describe("getPrompt", () => {
      it("should call promptsService.getPrompt", async () => {
        vi.mocked(promptsService.getPrompt).mockResolvedValue(mockPrompt)

        const result = await storageService.getPrompt("test-id")

        expect(promptsService.getPrompt).toHaveBeenCalledWith("test-id")
        expect(result).toBe(mockPrompt)
      })

      it("should return null when prompt not found", async () => {
        vi.mocked(promptsService.getPrompt).mockResolvedValue(null)

        const result = await storageService.getPrompt("non-existent")

        expect(result).toBeNull()
      })
    })

    describe("getAllPrompts", () => {
      it("should call promptsService.getAllPrompts", async () => {
        const mockPrompts = [mockPrompt]
        vi.mocked(promptsService.getAllPrompts).mockResolvedValue(mockPrompts)

        const result = await storageService.getAllPrompts()

        expect(promptsService.getAllPrompts).toHaveBeenCalled()
        expect(result).toBe(mockPrompts)
      })
    })

    describe("incrementExecutionCount", () => {
      it("should call promptsService.incrementExecutionCount", async () => {
        vi.mocked(promptsService.incrementExecutionCount).mockResolvedValue()

        await storageService.incrementExecutionCount(
          "test-id",
          "https://example.com",
        )

        expect(promptsService.incrementExecutionCount).toHaveBeenCalledWith(
          "test-id",
          "https://example.com",
        )
      })
    })

    describe("watchPrompts", () => {
      it("should call promptsService.watchPrompts", () => {
        const callback = vi.fn()
        const unsubscribe = vi.fn()
        vi.mocked(promptsService.watchPrompts).mockReturnValue(unsubscribe)

        const result = storageService.watchPrompts(callback)

        expect(promptsService.watchPrompts).toHaveBeenCalledWith(callback)
        expect(result).toBe(unsubscribe)
      })
    })
  })

  describe("Session operations", () => {
    const mockSession: Session = {
      activePromptId: "test-id",
      url: "https://example.com",
      startedAt: new Date(),
    }

    describe("startSession", () => {
      it("should call sessionsService.startSession", async () => {
        vi.mocked(sessionsService.startSession).mockResolvedValue()

        await storageService.startSession("test-id")

        expect(sessionsService.startSession).toHaveBeenCalledWith("test-id")
      })
    })

    describe("endSession", () => {
      it("should call sessionsService.endSession", async () => {
        vi.mocked(sessionsService.endSession).mockResolvedValue()

        await storageService.endSession()

        expect(sessionsService.endSession).toHaveBeenCalled()
      })
    })

    describe("getCurrentSession", () => {
      it("should call sessionsService.getCurrentSession", async () => {
        vi.mocked(sessionsService.getCurrentSession).mockResolvedValue(
          mockSession,
        )

        const result = await storageService.getCurrentSession()

        expect(sessionsService.getCurrentSession).toHaveBeenCalled()
        expect(result).toBe(mockSession)
      })
    })

    describe("hasActiveSession", () => {
      it("should return false (sync implementation)", () => {
        const result = storageService.hasActiveSession()

        expect(result).toBe(false)
      })
    })

    describe("hasActiveSessionAsync", () => {
      it("should call sessionsService.hasActiveSession", async () => {
        vi.mocked(sessionsService.hasActiveSession).mockResolvedValue(true)

        const result = await storageService.hasActiveSessionAsync()

        expect(sessionsService.hasActiveSession).toHaveBeenCalled()
        expect(result).toBe(true)
      })
    })
  })

  describe("Pin operations", () => {
    describe("pinPrompt", () => {
      it("should call pinsService.pinPrompt", async () => {
        vi.mocked(pinsService.pinPrompt).mockResolvedValue()

        await storageService.pinPrompt("test-id")

        expect(pinsService.pinPrompt).toHaveBeenCalledWith("test-id")
      })
    })

    describe("unpinPrompt", () => {
      it("should call pinsService.unpinPrompt", async () => {
        vi.mocked(pinsService.unpinPrompt).mockResolvedValue()

        await storageService.unpinPrompt("test-id")

        expect(pinsService.unpinPrompt).toHaveBeenCalledWith("test-id")
      })
    })

    describe("getPinnedOrder", () => {
      it("should call pinsService.getPinnedOrder", async () => {
        const mockOrder = ["id1", "id2"]
        vi.mocked(pinsService.getPinnedOrder).mockResolvedValue(mockOrder)

        const result = await storageService.getPinnedOrder()

        expect(pinsService.getPinnedOrder).toHaveBeenCalled()
        expect(result).toBe(mockOrder)
      })
    })

    describe("updatePinnedOrder", () => {
      it("should call pinsService.updatePinnedOrder", async () => {
        const order = ["id1", "id2"]
        vi.mocked(pinsService.updatePinnedOrder).mockResolvedValue()

        await storageService.updatePinnedOrder(order)

        expect(pinsService.updatePinnedOrder).toHaveBeenCalledWith(order)
      })
    })

    describe("watchPinnedOrder", () => {
      it("should call pinsService.watchPinnedOrder", () => {
        const callback = vi.fn()
        const unsubscribe = vi.fn()
        vi.mocked(pinsService.watchPinnedOrder).mockReturnValue(unsubscribe)

        const result = storageService.watchPinnedOrder(callback)

        expect(pinsService.watchPinnedOrder).toHaveBeenCalledWith(callback)
        expect(result).toBe(unsubscribe)
      })
    })
  })

  describe("Settings operations", () => {
    const mockSettings: AppSettings = {
      autoSaveEnabled: true,
      autoCompleteEnabled: true,
      maxPrompts: 100,
      sortOrder: "recent",
      showNotifications: true,
      minimalMode: false,
    }

    describe("getSettings", () => {
      it("should call settingsService.getSettings", async () => {
        vi.mocked(settingsService.getSettings).mockResolvedValue(mockSettings)

        const result = await storageService.getSettings()

        expect(settingsService.getSettings).toHaveBeenCalled()
        expect(result).toBe(mockSettings)
      })
    })

    describe("setSettings", () => {
      it("should call settingsService.setSettings", async () => {
        const updates = { autoSaveEnabled: false }
        vi.mocked(settingsService.setSettings).mockResolvedValue()

        await storageService.setSettings(updates)

        expect(settingsService.setSettings).toHaveBeenCalledWith(updates)
      })
    })

    describe("watchSettings", () => {
      it("should call settingsService.watchSettings", () => {
        const callback = vi.fn()
        const unsubscribe = vi.fn()
        vi.mocked(settingsService.watchSettings).mockReturnValue(unsubscribe)

        const result = storageService.watchSettings(callback)

        expect(settingsService.watchSettings).toHaveBeenCalledWith(callback)
        expect(result).toBe(unsubscribe)
      })
    })
  })

  describe("Statistics and utilities", () => {
    describe("getStats", () => {
      it("should return default stats (sync implementation)", () => {
        const result = storageService.getStats()

        expect(result).toEqual({
          totalPrompts: 0,
          pinnedPrompts: 0,
          totalExecutions: 0,
        })
      })
    })

    describe("getStatsAsync", () => {
      it("should calculate stats from prompts", async () => {
        const mockPrompts: Prompt[] = [
          {
            id: "1",
            name: "Prompt 1",
            content: "Content 1",
            executionCount: 5,
            lastExecutedAt: new Date("2024-01-15"),
            isPinned: true,
            lastExecutionUrl: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2",
            name: "Prompt 2",
            content: "Content 2",
            executionCount: 10,
            lastExecutedAt: new Date("2024-01-16"),
            isPinned: false,
            lastExecutionUrl: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
        vi.mocked(promptsService.getAllPrompts).mockResolvedValue(mockPrompts)

        const result = await storageService.getStatsAsync()

        expect(result.totalPrompts).toBe(2)
        expect(result.pinnedPrompts).toBe(1)
        expect(result.totalExecutions).toBe(15)
        expect(result.mostExecutedPrompt?.id).toBe("2")
        expect(result.recentlyExecutedPrompt?.id).toBe("2")
      })

      it("should handle empty prompts array", async () => {
        vi.mocked(promptsService.getAllPrompts).mockResolvedValue([])

        const result = await storageService.getStatsAsync()

        expect(result.totalPrompts).toBe(0)
        expect(result.pinnedPrompts).toBe(0)
        expect(result.totalExecutions).toBe(0)
        expect(result.mostExecutedPrompt).toBeUndefined()
        expect(result.recentlyExecutedPrompt).toBeUndefined()
      })
    })
  })

  describe("AI Config Cache operations", () => {
    const mockConfigs: Record<string, AIServiceConfigData> = {
      chatgpt: {
        serviceName: "ChatGPT",
        selectors: {
          textInput: ["#prompt-textarea"],
          sendButton: ["[data-testid='send-button']"],
        },
        popupPlacement: {
          alignOffset: 0,
          sideOffset: 5,
        },
      },
      gemini: {
        serviceName: "Gemini",
        selectors: {
          textInput: ["rich-textarea"],
          sendButton: ["[data-testid='send-button']"],
        },
        popupPlacement: {
          alignOffset: 0,
          sideOffset: 5,
        },
      },
    }

    describe("getTodaysAiConfigCache", () => {
      it("should call aiConfigCacheService.getTodaysCache", async () => {
        vi.mocked(aiConfigCacheService.getTodaysCache).mockResolvedValue(
          mockConfigs,
        )

        const result = await storageService.getTodaysAiConfigCache()

        expect(aiConfigCacheService.getTodaysCache).toHaveBeenCalled()
        expect(result).toBe(mockConfigs)
      })
    })

    describe("saveAiConfigCache", () => {
      it("should call aiConfigCacheService.saveCache", async () => {
        vi.mocked(aiConfigCacheService.saveCache).mockResolvedValue()

        await storageService.saveAiConfigCache(mockConfigs)

        expect(aiConfigCacheService.saveCache).toHaveBeenCalledWith(mockConfigs)
      })
    })

    describe("getLatestAiConfigCache", () => {
      it("should call aiConfigCacheService.getLatestCache", async () => {
        vi.mocked(aiConfigCacheService.getLatestCache).mockResolvedValue(
          mockConfigs,
        )

        const result = await storageService.getLatestAiConfigCache()

        expect(aiConfigCacheService.getLatestCache).toHaveBeenCalled()
        expect(result).toBe(mockConfigs)
      })
    })
  })

  describe("Data management", () => {
    describe("clearAllData", () => {
      it("should call clear methods on all services", async () => {
        vi.mocked(promptsService.clearPrompts).mockResolvedValue()
        vi.mocked(sessionsService.clearSessions).mockResolvedValue()
        vi.mocked(pinsService.clearPins).mockResolvedValue()
        vi.mocked(settingsService.clearSettings).mockResolvedValue()

        await storageService.clearAllData()

        expect(promptsService.clearPrompts).toHaveBeenCalled()
        expect(sessionsService.clearSessions).toHaveBeenCalled()
        expect(pinsService.clearPins).toHaveBeenCalled()
        expect(settingsService.clearSettings).toHaveBeenCalled()
      })

      it("should throw error when clear operations fail", async () => {
        const mockError = new Error("Clear failed")
        vi.mocked(promptsService.clearPrompts).mockRejectedValue(mockError)

        await expect(storageService.clearAllData()).rejects.toThrow(
          "Failed to clear all data",
        )
      })
    })
  })

  describe("Error handling", () => {
    describe("createError", () => {
      it("should create error object with correct structure", () => {
        // Access private method through type assertion
        const createError = (storageService as any).createError.bind(
          storageService,
        )

        const error = createError("TEST_CODE", "Test message", {
          detail: "test",
        })

        expect(error).toEqual({
          code: "TEST_CODE",
          message: "Test message",
          details: { detail: "test" },
        })
      })

      it("should create error object without details", () => {
        const createError = (storageService as any).createError.bind(
          storageService,
        )

        const error = createError("TEST_CODE", "Test message")

        expect(error).toEqual({
          code: "TEST_CODE",
          message: "Test message",
          details: undefined,
        })
      })
    })
  })
})
