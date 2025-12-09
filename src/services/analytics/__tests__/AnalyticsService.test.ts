/**
 * Tests for AnalyticsService
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { ANALYTICS_EVENTS } from "../events"

// Create mock analytics functions using vi.hoisted
const { mockTrack, mockAutoTrack, mockGetValue } = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockAutoTrack: vi.fn(),
  mockGetValue: vi.fn(),
}))

// Mock @wxt-dev/analytics to prevent Browser.runtime.connect errors
vi.mock("@wxt-dev/analytics", () => ({
  createAnalytics: () => ({
    track: mockTrack,
    autoTrack: mockAutoTrack,
    enabled: {
      getValue: mockGetValue,
    },
  }),
}))

// Mock the #imports analytics module
vi.mock("#imports", () => ({
  analytics: {
    track: mockTrack,
    autoTrack: mockAutoTrack,
    enabled: {
      getValue: mockGetValue,
    },
  },
}))

// Import AnalyticsService after mocks are set up
import { AnalyticsService } from "../AnalyticsService"

describe("AnalyticsService", () => {
  let service: AnalyticsService

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Create a new service instance
    service = new AnalyticsService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("track", () => {
    it("should call analytics.track with the event name", async () => {
      mockTrack.mockResolvedValue(undefined)

      await service.track(ANALYTICS_EVENTS.EDIT_SAVE)

      expect(mockTrack).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.EDIT_SAVE,
        undefined,
      )
      expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should call analytics.track with event name and parameters", async () => {
      mockTrack.mockResolvedValue(undefined)

      const params = { value: 5, label: "test" }
      await service.track(ANALYTICS_EVENTS.ORGANIZER_SAVED, params)

      expect(mockTrack).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.ORGANIZER_SAVED,
        params,
      )
      expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should not throw when analytics.track fails", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})
      mockTrack.mockRejectedValue(new Error("Analytics error"))

      await expect(
        service.track(ANALYTICS_EVENTS.IMPROVE_PROMPT),
      ).resolves.toBeUndefined()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Analytics tracking failed:",
        expect.any(Error),
      )

      consoleWarnSpy.mockRestore()
    })

    it("should handle all event types", async () => {
      mockTrack.mockResolvedValue(undefined)

      const events = Object.values(ANALYTICS_EVENTS)
      for (const event of events) {
        await service.track(event)
      }

      expect(mockTrack).toHaveBeenCalledTimes(events.length)
    })

    it("should not block on analytics errors", async () => {
      mockTrack.mockRejectedValue(new Error("Network error"))
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})

      const startTime = Date.now()
      await service.track(ANALYTICS_EVENTS.SET_PROMPT)
      const endTime = Date.now()

      // Should complete quickly despite error
      expect(endTime - startTime).toBeLessThan(100)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe("autoTrack", () => {
    it("should call analytics.autoTrack with container", () => {
      const container = document.createElement("div")

      service.autoTrack(container)

      expect(mockAutoTrack).toHaveBeenCalledWith(container)
      expect(mockAutoTrack).toHaveBeenCalledTimes(1)
    })

    it("should not throw when autoTrack fails", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})
      mockAutoTrack.mockImplementation(() => {
        throw new Error("Auto-track error")
      })

      const container = document.createElement("div")

      expect(() => service.autoTrack(container)).not.toThrow()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Analytics auto-tracking initialization failed:",
        expect.any(Error),
      )

      consoleWarnSpy.mockRestore()
    })

    it("should handle various container elements", () => {
      mockAutoTrack.mockImplementation(() => {})

      const div = document.createElement("div")
      const section = document.createElement("section")
      const main = document.createElement("main")

      service.autoTrack(div)
      service.autoTrack(section)
      service.autoTrack(main)

      expect(mockAutoTrack).toHaveBeenCalledTimes(3)
      expect(mockAutoTrack).toHaveBeenCalledWith(div)
      expect(mockAutoTrack).toHaveBeenCalledWith(section)
      expect(mockAutoTrack).toHaveBeenCalledWith(main)
    })
  })

  describe("isEnabled", () => {
    it("should return true when analytics is enabled", async () => {
      mockGetValue.mockResolvedValue(true)

      const result = await service.isEnabled()

      expect(result).toBe(true)
      expect(mockGetValue).toHaveBeenCalledTimes(1)
    })

    it("should return false when analytics is disabled", async () => {
      mockGetValue.mockResolvedValue(false)

      const result = await service.isEnabled()

      expect(result).toBe(false)
    })

    it("should return false when getValue fails", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})
      mockGetValue.mockRejectedValue(new Error("Get value error"))

      const result = await service.isEnabled()

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to check analytics enabled status:",
        expect.any(Error),
      )

      consoleWarnSpy.mockRestore()
    })

    it("should return false when enabled value is undefined", async () => {
      mockGetValue.mockResolvedValue(undefined)

      const result = await service.isEnabled()

      expect(result).toBe(false)
    })

    it("should return false when enabled value is null", async () => {
      mockGetValue.mockResolvedValue(null)

      const result = await service.isEnabled()

      expect(result).toBe(false)
    })
  })

  describe("singleton instance", () => {
    it("should export analyticsService singleton", async () => {
      const module = await import("../AnalyticsService")

      expect(module.analyticsService).toBeDefined()
      expect(module.analyticsService).toBeInstanceOf(AnalyticsService)
    })

    it("should be the same instance when imported multiple times", async () => {
      const module1 = await import("../AnalyticsService")
      const module2 = await import("../AnalyticsService")

      expect(module1.analyticsService).toBe(module2.analyticsService)
    })
  })

  describe("error handling consistency", () => {
    it("should always log errors to console.warn", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})

      // Test track error
      mockTrack.mockRejectedValue(new Error("Track error"))
      await service.track(ANALYTICS_EVENTS.EDIT_SAVE)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Analytics tracking failed:",
        expect.any(Error),
      )

      consoleWarnSpy.mockClear()

      // Test autoTrack error
      mockAutoTrack.mockImplementation(() => {
        throw new Error("AutoTrack error")
      })
      service.autoTrack(document.createElement("div"))
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Analytics auto-tracking initialization failed:",
        expect.any(Error),
      )

      consoleWarnSpy.mockClear()

      // Test isEnabled error
      mockGetValue.mockRejectedValue(new Error("GetValue error"))
      await service.isEnabled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to check analytics enabled status:",
        expect.any(Error),
      )

      consoleWarnSpy.mockRestore()
    })

    it("should never throw errors to calling code", async () => {
      mockTrack.mockRejectedValue(new Error("Critical error"))
      mockAutoTrack.mockImplementation(() => {
        throw new Error("Critical error")
      })
      mockGetValue.mockRejectedValue(new Error("Critical error"))

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})

      // All methods should complete without throwing
      await expect(
        service.track(ANALYTICS_EVENTS.EDIT_SAVE),
      ).resolves.toBeUndefined()
      expect(() =>
        service.autoTrack(document.createElement("div")),
      ).not.toThrow()
      await expect(service.isEnabled()).resolves.toBe(false)

      consoleWarnSpy.mockRestore()
    })
  })
})
