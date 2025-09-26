import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { AiConfigCacheService } from "../aiConfigCache"
import { aiConfigCacheStorage } from "../definitions"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

// Mock the storage
vi.mock("../definitions", () => ({
  aiConfigCacheStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
}))

describe("AiConfigCacheService", () => {
  let service: AiConfigCacheService

  beforeEach(() => {
    service = new AiConfigCacheService()
    vi.clearAllMocks()

    // Mock the current date for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("getTodaysCache", () => {
    it("should return null when no cache exists", async () => {
      vi.mocked(aiConfigCacheStorage.getValue).mockResolvedValue(null)

      const result = await service.getTodaysCache()

      expect(result).toBeNull()
      expect(aiConfigCacheStorage.getValue).toHaveBeenCalledOnce()
    })

    it("should return null when cache exists but is not from today", async () => {
      const configs = {
        service1: "config1",
        service2: "config2",
      } as unknown as Record<string, AIServiceConfigData>
      const yesterdayCache = {
        date: "2024-01-14",
        configs,
        cachedAt: Date.now() - 86400000, // 1 day ago
      }
      vi.mocked(aiConfigCacheStorage.getValue).mockResolvedValue(yesterdayCache)

      const result = await service.getTodaysCache()

      expect(result).toBeNull()
    })

    it("should return configs when cache is from today", async () => {
      const configs = {
        service1: "config1",
        service2: "config2",
      } as unknown as Record<string, AIServiceConfigData>
      const todaysCache = {
        date: "2024-01-15",
        configs,
        cachedAt: Date.now(),
      }
      vi.mocked(aiConfigCacheStorage.getValue).mockResolvedValue(todaysCache)

      const result = await service.getTodaysCache()

      expect(result).toEqual({ service1: "config1", service2: "config2" })
    })
  })

  describe("saveCache", () => {
    it("should save configs with today's date and current timestamp", async () => {
      const configs = {
        service1: "config1",
        service2: "config2",
      } as unknown as Record<string, AIServiceConfigData>
      const expectedCacheData = {
        date: "2024-01-15",
        configs,
        cachedAt: Date.now(),
      }

      await service.saveCache(configs)

      expect(aiConfigCacheStorage.setValue).toHaveBeenCalledWith(
        expectedCacheData,
      )
    })

    it("should handle empty configs", async () => {
      const configs = {}
      const expectedCacheData = {
        date: "2024-01-15",
        configs: {},
        cachedAt: Date.now(),
      }

      await service.saveCache(configs)

      expect(aiConfigCacheStorage.setValue).toHaveBeenCalledWith(
        expectedCacheData,
      )
    })
  })

  describe("getLatestCache", () => {
    it("should return null when no cache exists", async () => {
      vi.mocked(aiConfigCacheStorage.getValue).mockResolvedValue(null)

      const result = await service.getLatestCache()

      expect(result).toBeNull()
    })

    it("should return configs from any available cache data", async () => {
      const configs = {
        service1: "config1",
        service2: "config2",
      } as unknown as Record<string, AIServiceConfigData>

      const cacheData = {
        date: "2024-01-14",
        configs: configs, // Old date but should still return
        cachedAt: Date.now() - 86400000,
      }
      vi.mocked(aiConfigCacheStorage.getValue).mockResolvedValue(cacheData)

      const result = await service.getLatestCache()

      expect(result).toEqual(configs)
    })
  })

  describe("isToday", () => {
    it("should return true for today's date", () => {
      const result = service.isToday("2024-01-15")
      expect(result).toBe(true)
    })

    it("should return false for yesterday's date", () => {
      const result = service.isToday("2024-01-14")
      expect(result).toBe(false)
    })

    it("should return false for tomorrow's date", () => {
      const result = service.isToday("2024-01-16")
      expect(result).toBe(false)
    })

    it("should handle different date formats correctly", () => {
      expect(service.isToday("2024-1-15")).toBe(false) // Incorrect format
      expect(service.isToday("01-15-2024")).toBe(false) // Incorrect format
      expect(service.isToday("2024-01-15")).toBe(true) // Correct format
    })
  })

  describe("getCurrentDateString", () => {
    it("should return current date in YYYY-MM-DD format", () => {
      const result = service.getCurrentDateString()
      expect(result).toBe("2024-01-15")
    })

    it("should handle single digit months and days with leading zeros", () => {
      vi.setSystemTime(new Date("2024-03-05T10:00:00Z"))
      const result = service.getCurrentDateString()
      expect(result).toBe("2024-03-05")
    })
  })

  describe("error handling", () => {
    it("should handle storage errors gracefully in getTodaysCache", async () => {
      vi.mocked(aiConfigCacheStorage.getValue).mockRejectedValue(
        new Error("Storage error"),
      )

      await expect(service.getTodaysCache()).rejects.toThrow("Storage error")
    })

    it("should handle storage errors gracefully in saveCache", async () => {
      vi.mocked(aiConfigCacheStorage.setValue).mockRejectedValue(
        new Error("Storage error"),
      )

      await expect(service.saveCache({})).rejects.toThrow("Storage error")
    })

    it("should handle storage errors gracefully in getLatestCache", async () => {
      vi.mocked(aiConfigCacheStorage.getValue).mockRejectedValue(
        new Error("Storage error"),
      )

      await expect(service.getLatestCache()).rejects.toThrow("Storage error")
    })
  })
})
