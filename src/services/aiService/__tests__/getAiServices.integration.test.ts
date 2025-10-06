import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getAiServices } from "../index"
import { StorageService } from "../../storage"

// Mock fetch
// eslint-disable-next-line no-undef
global.fetch = vi.fn()

const endpoint =
  "https://ujiro99.github.io/prompt-history/data/promptHistory.json"

// Mock import.meta.env
vi.mock("import.meta", () => ({
  env: {
    WXT_CONFIG_ENDPOINT: endpoint,
  },
}))

// Mock storage service
vi.mock("../../storage", () => ({
  StorageService: {
    getInstance: vi.fn(() => ({
      getTodaysAiConfigCache: vi.fn(),
      saveAiConfigCache: vi.fn(),
      getLatestAiConfigCache: vi.fn(),
    })),
  },
}))

describe("getAiServices integration", () => {
  let mockStorage: any

  beforeEach(() => {
    mockStorage = {
      getTodaysAiConfigCache: vi.fn(),
      saveAiConfigCache: vi.fn(),
      getLatestAiConfigCache: vi.fn(),
    }
    vi.mocked(StorageService.getInstance).mockReturnValue(mockStorage)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("cache hit flow", () => {
    it("should use cached configs when available for today", async () => {
      const cachedConfigs = {
        TestPage: {
          selectors: {
            textInput: ['div[contenteditable="true"]'],
            sendButton: ['button[type="submit"]'],
          },
        },
      }
      mockStorage.getTodaysAiConfigCache.mockResolvedValue(cachedConfigs)

      const services = await getAiServices()

      expect(mockStorage.getTodaysAiConfigCache).toHaveBeenCalledOnce()
      expect(fetch).not.toHaveBeenCalled()
      expect(mockStorage.saveAiConfigCache).not.toHaveBeenCalled()
      expect(services).toHaveLength(5) // TestPage, ChatGpt, Gemini, Perplexity, Claude
    })
  })

  describe("cache miss -> fetch success flow", () => {
    it("should fetch and cache configs when no cache available", async () => {
      const fetchedConfigs = {
        TestPage: {
          selectors: {
            textInput: ['div[contenteditable="true"]'],
            sendButton: ['button[type="submit"]'],
          },
        },
      }
      mockStorage.getTodaysAiConfigCache.mockResolvedValue(null)
      vi.mocked(fetch).mockResolvedValue({
        json: () => Promise.resolve(fetchedConfigs),
      } as Response)

      const services = await getAiServices()

      expect(mockStorage.getTodaysAiConfigCache).toHaveBeenCalledOnce()
      expect(fetch).toHaveBeenCalledWith(endpoint)
      expect(mockStorage.saveAiConfigCache).toHaveBeenCalledWith(fetchedConfigs)
      expect(services).toHaveLength(5)
    })
  })

  describe("fetch fail -> fallback flow", () => {
    it("should use fallback cache when fetch fails", async () => {
      const fallbackConfigs = {
        TestPage: {
          selectors: {
            textInput: ['div[contenteditable="true"]'],
            sendButton: ['button[type="submit"]'],
          },
        },
      }
      mockStorage.getTodaysAiConfigCache.mockResolvedValue(null)
      mockStorage.getLatestAiConfigCache.mockResolvedValue(fallbackConfigs)
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"))

      const services = await getAiServices()

      expect(mockStorage.getTodaysAiConfigCache).toHaveBeenCalledOnce()
      expect(fetch).toHaveBeenCalledWith(endpoint)
      expect(mockStorage.saveAiConfigCache).not.toHaveBeenCalled()
      expect(mockStorage.getLatestAiConfigCache).toHaveBeenCalledOnce()
      expect(services).toHaveLength(5)
    })

    it("should throw error when both fetch and fallback fail", async () => {
      mockStorage.getTodaysAiConfigCache.mockResolvedValue(null)
      mockStorage.getLatestAiConfigCache.mockResolvedValue(null)
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"))

      await expect(getAiServices()).rejects.toThrow(
        "No AI service configs available",
      )

      expect(mockStorage.getTodaysAiConfigCache).toHaveBeenCalledOnce()
      expect(fetch).toHaveBeenCalledWith(endpoint)
      expect(mockStorage.getLatestAiConfigCache).toHaveBeenCalledOnce()
    })
  })

  describe("error handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockStorage.getTodaysAiConfigCache.mockRejectedValue(
        new Error("Storage error"),
      )

      await expect(getAiServices()).rejects.toThrow("Storage error")
    })

    it("should handle fetch response parsing errors", async () => {
      const fallbackConfigs = {
        TestPage: {
          selectors: {
            textInput: ['div[contenteditable="true"]'],
            sendButton: ['button[type="submit"]'],
          },
        },
      }
      mockStorage.getTodaysAiConfigCache.mockResolvedValue(null)
      mockStorage.getLatestAiConfigCache.mockResolvedValue(fallbackConfigs)
      vi.mocked(fetch).mockResolvedValue({
        json: () => Promise.reject(new Error("JSON parse error")),
      } as Response)

      const services = await getAiServices()

      expect(mockStorage.getLatestAiConfigCache).toHaveBeenCalledOnce()
      expect(services).toHaveLength(5)
    })
  })

  describe("service instantiation", () => {
    it("should create all required services with configs", async () => {
      const testConfigs = {
        TestPage: {
          selectors: {
            textInput: ['div[contenteditable="true"]'],
            sendButton: ['button[type="submit"]'],
          },
        },
      }
      mockStorage.getTodaysAiConfigCache.mockResolvedValue(testConfigs)

      const services = await getAiServices()

      expect(services).toHaveLength(5)

      // Check that TestPageService receives the configs
      const testPageService = services[0]
      expect(testPageService.constructor.name).toBe("TestPageService")

      // Other services should still be instantiated
      expect(services[1].constructor.name).toBe("ChatGptService")
      expect(services[2].constructor.name).toBe("GeminiService")
      expect(services[3].constructor.name).toBe("PerplexityService")
      expect(services[4].constructor.name).toBe("ClaudeService")
    })
  })
})
