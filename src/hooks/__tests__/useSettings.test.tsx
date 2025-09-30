import React from "react"
import { renderHook, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSettings } from "../useSettings"
import { SettingsProvider } from "@/contexts/SettingsContext"
import type { AppSettings } from "@/types/prompt"

// Mock storage service - define the mock inline to avoid hoisting issues
vi.mock("@/services/storage", () => ({
  StorageService: {
    getInstance: vi.fn().mockReturnValue({
      getSettings: vi.fn(),
      setSettings: vi.fn(),
      watchSettings: vi.fn(),
    }),
  },
}))

// Import mocked module to get typed mock functions
import { StorageService } from "@/services/storage"
const mockStorageService = StorageService.getInstance() as any

describe("useSettings Hook", () => {
  const defaultSettings: AppSettings = {
    autoSaveEnabled: true,
    autoCompleteEnabled: true,
    maxPrompts: 100,
    sortOrder: "recent",
    showNotifications: true,
    autoCompleteTarget: "all",
  }

  // Wrapper component that provides SettingsContext
  const createWrapper = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    )
    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageService.getSettings.mockResolvedValue(defaultSettings)
    mockStorageService.setSettings.mockResolvedValue(undefined)
    mockStorageService.watchSettings.mockReturnValue(() => {}) // unsubscribe function
  })

  describe("Settings Persistence Tests - Initialization", () => {
    it("should load settings on mount", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      expect(mockStorageService.getSettings).toHaveBeenCalledTimes(1)

      // Initially, settings is an empty object and isLoaded is false
      expect(result.current.settings).toEqual({})
      expect(result.current.isLoaded).toBe(false)

      // Wait for settings to be loaded asynchronously
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.isLoaded).toBe(true)
      expect(result.current.settings).toEqual(defaultSettings)
    })

    it("should handle settings loading errors gracefully", async () => {
      mockStorageService.getSettings.mockRejectedValue(new Error("Load failed"))

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        // Wait longer for the promise rejection to be processed
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      // When an error occurs, isLoaded remains false
      expect(result.current.isLoaded).toBe(false)
      expect(result.current.settings).toEqual({})
      expect(mockStorageService.getSettings).toHaveBeenCalledTimes(1)
    })
  })

  describe("Settings Persistence Tests - Settings Updates", () => {
    it("should update individual settings correctly", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.update({ autoSaveEnabled: false })
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith({
        autoSaveEnabled: false,
      })
    })

    it("should update multiple settings at once", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      const newSettings = {
        autoSaveEnabled: false,
        autoCompleteEnabled: false,
        showNotifications: false,
      }

      await act(async () => {
        await result.current.update(newSettings)
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith(newSettings)
    })

    it("should handle settings update errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      mockStorageService.setSettings.mockRejectedValue(
        new Error("Update failed"),
      )

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // The update call itself doesn't throw, but the error should be handled internally
      await act(async () => {
        await expect(
          result.current.update({ autoSaveEnabled: false }),
        ).rejects.toThrow("Update failed")
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith({
        autoSaveEnabled: false,
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe("Settings Persistence Tests - Real-time Sync", () => {
    it("should watch for settings changes", () => {
      renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      expect(mockStorageService.watchSettings).toHaveBeenCalledTimes(1)
      expect(mockStorageService.watchSettings).toHaveBeenCalledWith(
        expect.any(Function),
      )
    })

    it("should update state when settings change externally", async () => {
      let watchCallback: (newSettings: AppSettings) => void

      mockStorageService.watchSettings.mockImplementation(
        (callback: (newSettings: AppSettings) => void) => {
          watchCallback = callback
          return () => {} // unsubscribe function
        },
      )

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      const newSettings: AppSettings = {
        ...defaultSettings,
        autoSaveEnabled: false,
      }

      // Simulate external settings change
      await act(async () => {
        watchCallback!(newSettings)
      })

      expect(result.current.settings).toEqual(newSettings)
    })

    it("should cleanup watcher on unmount", () => {
      const unsubscribeMock = vi.fn()
      mockStorageService.watchSettings.mockReturnValue(unsubscribeMock)

      const { unmount } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      unmount()

      expect(unsubscribeMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("Settings Persistence Tests - Cross-session Persistence", () => {
    it("should persist autoSaveEnabled setting", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.update({ autoSaveEnabled: false })
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith({
        autoSaveEnabled: false,
      })
    })

    it("should persist autoCompleteEnabled setting", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.update({ autoCompleteEnabled: false })
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith({
        autoCompleteEnabled: false,
      })
    })

    it("should persist showNotifications setting", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.update({ showNotifications: false })
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith({
        showNotifications: false,
      })
    })

    it("should persist autoCompleteTarget setting", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.update({ autoCompleteTarget: "pinned" })
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledWith({
        autoCompleteTarget: "pinned",
      })
    })
  })

  describe("Settings Persistence Tests - Default Value Application", () => {
    it("should handle undefined autoCompleteEnabled setting", async () => {
      const settingsWithUndefined = {
        ...defaultSettings,
        autoCompleteEnabled: undefined,
      } as any
      mockStorageService.getSettings.mockResolvedValue(settingsWithUndefined)

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Hook returns settings as-is, so default values are applied on the component side
      expect(result.current.settings?.autoCompleteEnabled).toBeUndefined()
    })

    it("should handle undefined autoCompleteTarget setting", async () => {
      const settingsWithUndefined = {
        ...defaultSettings,
        autoCompleteTarget: undefined,
      }
      mockStorageService.getSettings.mockResolvedValue(settingsWithUndefined)

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Hook returns settings as-is, so default values are applied on the component side
      expect(result.current.settings?.autoCompleteTarget).toBeUndefined()
    })
  })

  describe("Settings Persistence Tests - Concurrent Update Handling", () => {
    it("should handle concurrent setting updates", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      const updates = [
        { autoSaveEnabled: false },
        { autoCompleteEnabled: false },
        { showNotifications: false },
      ]

      // Execute multiple updates concurrently
      await act(async () => {
        await Promise.all(
          updates.map((update) => result.current.update(update)),
        )
      })

      // Verify that each update is called correctly
      expect(mockStorageService.setSettings).toHaveBeenCalledTimes(3)
      updates.forEach((update) => {
        expect(mockStorageService.setSettings).toHaveBeenCalledWith(update)
      })
    })

    it("should handle rapid successive updates", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      await act(async () => {
        await result.current.update({ autoSaveEnabled: false })
        await result.current.update({ autoSaveEnabled: true })
        await result.current.update({ autoSaveEnabled: false })
      })

      expect(mockStorageService.setSettings).toHaveBeenCalledTimes(3)
      expect(mockStorageService.setSettings).toHaveBeenNthCalledWith(1, {
        autoSaveEnabled: false,
      })
      expect(mockStorageService.setSettings).toHaveBeenNthCalledWith(2, {
        autoSaveEnabled: true,
      })
      expect(mockStorageService.setSettings).toHaveBeenNthCalledWith(3, {
        autoSaveEnabled: false,
      })
    })
  })
})
