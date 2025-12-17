import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useVariablePresets } from "../useVariablePresets"
import type { VariablePreset } from "@/types/prompt"
import {
  getVariablePresets,
  watchVariablePresets,
  watchVariablePreset,
} from "@/services/storage/variablePresetStorage"

// Mock storage functions
vi.mock("@/services/storage/variablePresetStorage", () => ({
  getVariablePresets: vi.fn(),
  watchVariablePresets: vi.fn(),
  watchVariablePreset: vi.fn(),
}))

describe("useVariablePresets", () => {
  const mockPreset1: VariablePreset = {
    id: "preset-1",
    name: "Test Preset 1",
    type: "text",
    description: "Test description",
    textContent: "Test content",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }

  const mockPreset2: VariablePreset = {
    id: "preset-2",
    name: "Test Preset 2",
    type: "dictionary",
    description: "Dictionary preset",
    dictionaryItems: [
      { id: "item-1", name: "Item 1", content: "Content 1" },
    ],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("watch all presets", () => {
    it("should load all presets on mount", async () => {
      const mockPresets = [mockPreset1, mockPreset2]
      vi.mocked(getVariablePresets).mockResolvedValue(mockPresets)
      vi.mocked(watchVariablePresets).mockReturnValue(vi.fn())

      const { result } = renderHook(() => useVariablePresets())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.presets).toEqual(mockPresets)
      expect(result.current.preset).toBe(null)
      expect(result.current.error).toBe(null)
      expect(getVariablePresets).toHaveBeenCalled()
    })

    it("should watch for preset changes", async () => {
      let watchCallback: (presets: VariablePreset[]) => void = () => {}
      const mockPresets = [mockPreset1]

      vi.mocked(getVariablePresets).mockResolvedValue(mockPresets)
      vi.mocked(watchVariablePresets).mockImplementation((cb) => {
        watchCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useVariablePresets())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Initially has one preset
      expect(result.current.presets).toEqual(mockPresets)

      // Simulate preset change
      const updatedPresets = [mockPreset1, mockPreset2]
      watchCallback(updatedPresets)

      await waitFor(() => {
        expect(result.current.presets).toEqual(updatedPresets)
      })
    })

    it("should cleanup watch on unmount", async () => {
      const unwatch = vi.fn()
      vi.mocked(getVariablePresets).mockResolvedValue([])
      vi.mocked(watchVariablePresets).mockReturnValue(unwatch)

      const { unmount } = renderHook(() => useVariablePresets())

      await waitFor(() => {
        expect(watchVariablePresets).toHaveBeenCalled()
      })

      unmount()

      expect(unwatch).toHaveBeenCalled()
    })

    it("should handle loading errors", async () => {
      const mockError = new Error("Failed to load")
      vi.mocked(getVariablePresets).mockRejectedValue(mockError)
      vi.mocked(watchVariablePresets).mockReturnValue(vi.fn())

      const { result } = renderHook(() => useVariablePresets())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toEqual(mockError)
      expect(result.current.presets).toBe(null)
    })
  })

  describe("watch specific preset", () => {
    it("should watch specific preset by ID", async () => {
      let watchCallback: (preset: VariablePreset | null) => void = () => {}

      vi.mocked(getVariablePresets).mockResolvedValue([mockPreset1, mockPreset2])
      vi.mocked(watchVariablePreset).mockImplementation((_, cb) => {
        watchCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useVariablePresets({ presetId: "preset-1" }),
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preset).toEqual(mockPreset1)
      expect(result.current.presets).toBe(null)
      expect(watchVariablePreset).toHaveBeenCalledWith(
        "preset-1",
        expect.any(Function),
      )
    })

    it("should update when preset changes", async () => {
      let watchCallback: (preset: VariablePreset | null) => void = () => {}

      vi.mocked(getVariablePresets).mockResolvedValue([mockPreset1])
      vi.mocked(watchVariablePreset).mockImplementation((_, cb) => {
        watchCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useVariablePresets({ presetId: "preset-1" }),
      )

      await waitFor(() => {
        expect(result.current.preset).toEqual(mockPreset1)
      })

      // Simulate preset update
      const updatedPreset = { ...mockPreset1, name: "Updated Name" }
      watchCallback(updatedPreset)

      await waitFor(() => {
        expect(result.current.preset?.name).toBe("Updated Name")
      })
    })

    it("should handle preset deletion", async () => {
      let watchCallback: (preset: VariablePreset | null) => void = () => {}

      vi.mocked(getVariablePresets).mockResolvedValue([mockPreset1])
      vi.mocked(watchVariablePreset).mockImplementation((_, cb) => {
        watchCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useVariablePresets({ presetId: "preset-1" }),
      )

      await waitFor(() => {
        expect(result.current.preset).toEqual(mockPreset1)
      })

      // Simulate preset deletion
      watchCallback(null)

      await waitFor(() => {
        expect(result.current.preset).toBe(null)
      })
    })

    it("should cleanup watch on unmount", async () => {
      const unwatch = vi.fn()
      vi.mocked(getVariablePresets).mockResolvedValue([mockPreset1])
      vi.mocked(watchVariablePreset).mockImplementation((_, cb) => {
        return unwatch
      })

      const { unmount } = renderHook(() =>
        useVariablePresets({ presetId: "preset-1" }),
      )

      await waitFor(() => {
        expect(watchVariablePreset).toHaveBeenCalled()
      })

      unmount()

      expect(unwatch).toHaveBeenCalled()
    })
  })

  describe("enabled option", () => {
    it("should not load presets when disabled", async () => {
      vi.mocked(getVariablePresets).mockResolvedValue([mockPreset1])
      vi.mocked(watchVariablePresets).mockReturnValue(vi.fn())

      const { result } = renderHook(() =>
        useVariablePresets({ enabled: false }),
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(getVariablePresets).not.toHaveBeenCalled()
      expect(watchVariablePresets).not.toHaveBeenCalled()
      expect(result.current.presets).toBe(null)
    })

    it("should not watch specific preset when disabled", async () => {
      vi.mocked(watchVariablePreset).mockImplementation((_, cb) => {
        cb(mockPreset1)
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useVariablePresets({ presetId: "preset-1", enabled: false }),
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(watchVariablePreset).not.toHaveBeenCalled()
      expect(result.current.preset).toBe(null)
    })

    it("should start watching when enabled changes to true", async () => {
      vi.mocked(getVariablePresets).mockResolvedValue([mockPreset1])
      vi.mocked(watchVariablePresets).mockReturnValue(vi.fn())

      const { result, rerender } = renderHook(
        ({ enabled }) => useVariablePresets({ enabled }),
        { initialProps: { enabled: false } },
      )

      expect(result.current.isLoading).toBe(false)
      expect(getVariablePresets).not.toHaveBeenCalled()

      // Enable watching
      rerender({ enabled: true })

      await waitFor(() => {
        expect(getVariablePresets).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(result.current.presets).toEqual([mockPreset1])
      })
    })
  })

  describe("presetId option change", () => {
    it("should re-watch when presetId changes", async () => {
      const unwatch1 = vi.fn()
      const unwatch2 = vi.fn()

      vi.mocked(getVariablePresets)
        .mockResolvedValueOnce([mockPreset1, mockPreset2])
        .mockResolvedValueOnce([mockPreset1, mockPreset2])

      vi.mocked(watchVariablePreset)
        .mockImplementationOnce((_, cb) => {
          return unwatch1
        })
        .mockImplementationOnce((_, cb) => {
          return unwatch2
        })

      const { result, rerender } = renderHook(
        ({ presetId }) => useVariablePresets({ presetId }),
        { initialProps: { presetId: "preset-1" } },
      )

      await waitFor(() => {
        expect(result.current.preset).toEqual(mockPreset1)
      })

      // Change preset ID
      rerender({ presetId: "preset-2" })

      await waitFor(() => {
        expect(unwatch1).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(result.current.preset).toEqual(mockPreset2)
      })
    })
  })
})
