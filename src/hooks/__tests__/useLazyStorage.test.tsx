import { renderHook, act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useLazyStorage } from "../useLazyStorage"
import type { WxtStorageItemLike } from "@/services/storage/lazyStorage"

describe("useLazyStorage", () => {
  let mockStorageItem: WxtStorageItemLike<string>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageItem = {
      getValue: vi.fn(),
      setValue: vi.fn(),
      watch: vi.fn(() => vi.fn()), // Returns unwatch function
      removeValue: vi.fn(),
    }
  })

  describe("Basic Functionality", () => {
    it("should load initial value from storage", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial value")

      const { result } = renderHook(() => useLazyStorage(mockStorageItem))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isSaving).toBe(false)

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.value).toBe("initial value")
      expect(result.current.debouncedValue).toBe("initial value")
      expect(result.current.isSaving).toBe(false)
      expect(mockStorageItem.getValue).toHaveBeenCalledTimes(1)
    })

    it("should update state and storage without debounce (default behavior)", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => useLazyStorage(mockStorageItem))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await result.current.setValue("new value")
      })

      expect(result.current.value).toBe("new value")
      expect(result.current.debouncedValue).toBe("new value")
      expect(result.current.isSaving).toBe(false)
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("new value")
    })

    it("should handle function updates", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => useLazyStorage(mockStorageItem))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.setValue((prev) =>
          prev ? prev + " updated" : "updated",
        )
      })

      expect(result.current.value).toBe("initial updated")
      expect(result.current.debouncedValue).toBe("initial updated")
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("initial updated")
    })

    it("should set isSaving true during save and false after completion", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => useLazyStorage(mockStorageItem))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.isSaving).toBe(false)

      act(() => {
        result.current.setValue("new value")
      })

      expect(result.current.isSaving).toBe(true)

      await waitFor(() => expect(result.current.isSaving).toBe(false))

      expect(mockStorageItem.setValue).toHaveBeenCalledWith("new value")
    })
  })

  describe("Debounce Functionality", () => {
    it("should debounce setValue calls when debounceDelay is set", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 500 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Make rapid setValue calls
      act(() => {
        result.current.setValue("value1")
      })

      // value should update immediately, debouncedValue should not
      // isSaving should be false during debounce period
      expect(result.current.value).toBe("value1")
      expect(result.current.debouncedValue).toBe("initial")
      expect(result.current.isSaving).toBe(false)

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()

      // Make another call within debounce period
      act(() => {
        result.current.setValue("value2")
      })

      // value updates again, debouncedValue still old
      // isSaving should still be false during debounce period
      expect(result.current.value).toBe("value2")
      expect(result.current.debouncedValue).toBe("initial")
      expect(result.current.isSaving).toBe(false)

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()

      // Wait for debounce delay
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
      })

      // debouncedValue should now be updated
      expect(result.current.debouncedValue).toBe("value2")
      expect(mockStorageItem.setValue).toHaveBeenCalledTimes(1)
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("value2")
      expect(result.current.isSaving).toBe(false)
    })

    it("should keep isSaving false during debounce period", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 500 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("test")
      })

      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      // Still false during debounce period
      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
      })

      // After timeout completion, isSaving should be false again (after write completes)
      expect(result.current.isSaving).toBe(false)
    })

    it("should immediately update value but delay debouncedValue update", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 300 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("updated")
      })

      // value updates immediately
      expect(result.current.value).toBe("updated")
      // debouncedValue should still be old
      expect(result.current.debouncedValue).toBe("initial")
      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
      })

      // debouncedValue should now be updated
      expect(result.current.debouncedValue).toBe("updated")
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("updated")
      expect(result.current.isSaving).toBe(false)
    })

    it("should cancel previous timer on rapid calls", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 500 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("first")
      })

      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      act(() => {
        result.current.setValue("second")
      })

      // Still false during debounce period
      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      act(() => {
        result.current.setValue("third")
      })

      // Still false during debounce period
      expect(result.current.isSaving).toBe(false)

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledTimes(1)
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("third")
      expect(result.current.debouncedValue).toBe("third")
      expect(result.current.isSaving).toBe(false)
    })

    it("should only write final value after debounce period", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 300 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Simulate typing
      const text = "hello"
      for (const char of text) {
        act(() => {
          result.current.setValue((prev) => (prev || "") + char)
        })
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
        })
      }

      expect(result.current.value).toBe("hello")
      expect(result.current.debouncedValue).toBe("")
      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledTimes(1)
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("hello")
      expect(result.current.debouncedValue).toBe("hello")
      expect(result.current.isSaving).toBe(false)
    })
  })

  describe("Interaction Tests", () => {
    it("should work with both debounceDelay and artificialSetDelay", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, {
          debounceDelay: 200,
          artificialSetDelay: 100,
        }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("test")
      })

      expect(result.current.value).toBe("test")
      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledWith("test")
      expect(result.current.isSaving).toBe(false)
    })

    it("should verify independent operation of both delays", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, {
          debounceDelay: 300,
          artificialSetDelay: 200,
        }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const startTime = Date.now()

      act(() => {
        result.current.setValue("value")
      })

      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
      })

      const elapsed = Date.now() - startTime

      expect(mockStorageItem.setValue).toHaveBeenCalledWith("value")
      expect(result.current.isSaving).toBe(false)
      expect(elapsed).toBeGreaterThanOrEqual(450)
    })
  })

  describe("Edge Cases", () => {
    it("should clear timer on unmount", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result, unmount } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 500 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("test")
      })

      // isSaving should be false during debounce period
      expect(result.current.isSaving).toBe(false)

      unmount()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
      })

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()
    })

    it("should handle function updates during debounce", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 300 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue((prev) => (prev || "") + "a")
      })

      expect(result.current.value).toBe("initiala")

      act(() => {
        result.current.setValue((prev) => (prev || "") + "b")
      })

      expect(result.current.value).toBe("initialab")

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledTimes(1)
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("initialab")
    })

    it("should handle rapid successive calls correctly", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 200 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      for (let i = 1; i <= 10; i++) {
        act(() => {
          result.current.setValue(`value${i}`)
        })
      }

      expect(result.current.value).toBe("value10")

      expect(mockStorageItem.setValue).not.toHaveBeenCalled()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledTimes(1)
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("value10")
    })

    it("should handle null values appropriately", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue(null)
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 200 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.value).toBe(null)

      act(() => {
        result.current.setValue("not null")
      })

      expect(result.current.value).toBe("not null")

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledWith("not null")
    })
  })

  describe("Watch Mechanism", () => {
    it("should update state when external changes occur", async () => {
      let watchCallback: ((newValue: string, oldValue: string) => void) | null =
        null

      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.watch = vi.fn((callback) => {
        watchCallback = callback
        return vi.fn()
      })

      const { result } = renderHook(() => useLazyStorage(mockStorageItem))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.value).toBe("initial")

      act(() => {
        watchCallback?.("external update", "initial")
      })

      expect(result.current.value).toBe("external update")
      expect(result.current.debouncedValue).toBe("external update")
    })

    it("should not cancel debounce timer when watch callback fires", async () => {
      let watchCallback: ((newValue: string, oldValue: string) => void) | null =
        null

      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)
      mockStorageItem.watch = vi.fn((callback) => {
        watchCallback = callback
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 500 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("local edit")
      })

      expect(result.current.value).toBe("local edit")

      act(() => {
        watchCallback?.("external", "initial")
      })

      expect(result.current.value).toBe("external")

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
      })

      expect(mockStorageItem.setValue).toHaveBeenCalledWith("local edit")
    })
  })

  describe("Performance", () => {
    it("should not cause unnecessary re-renders", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useLazyStorage(mockStorageItem, { debounceDelay: 200 })
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const initialRenderCount = renderCount

      act(() => {
        result.current.setValue("a")
      })
      act(() => {
        result.current.setValue("b")
      })
      act(() => {
        result.current.setValue("c")
      })

      // React batches state updates
      expect(renderCount).toBe(initialRenderCount + 3)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
      })

      // One more render for debouncedValue + setIsSaving(false)
      expect(renderCount).toBe(initialRenderCount + 4)
    })
  })

  describe("debouncedValue State", () => {
    it("should track debouncedValue correctly without debounce", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => useLazyStorage(mockStorageItem))

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.debouncedValue).toBe("initial")

      act(() => {
        result.current.setValue("test")
      })

      // Without debounce, both update together
      expect(result.current.value).toBe("test")
      expect(result.current.debouncedValue).toBe("test")

      await waitFor(() => expect(result.current.isSaving).toBe(false))

      expect(mockStorageItem.setValue).toHaveBeenCalledWith("test")
    })

    it("should track debouncedValue correctly with debounce", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("initial")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 300 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.debouncedValue).toBe("initial")

      act(() => {
        result.current.setValue("test")
      })

      // value updates immediately
      expect(result.current.value).toBe("test")
      // debouncedValue should still be old
      expect(result.current.debouncedValue).toBe("initial")

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Still not updated
      expect(result.current.debouncedValue).toBe("initial")

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      // Now updated
      expect(result.current.debouncedValue).toBe("test")
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("test")
    })

    it("should update debouncedValue on each debounce completion", async () => {
      mockStorageItem.getValue = vi.fn().mockResolvedValue("")
      mockStorageItem.setValue = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useLazyStorage(mockStorageItem, { debounceDelay: 200 }),
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setValue("first")
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
      })

      expect(result.current.debouncedValue).toBe("first")
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("first")

      act(() => {
        result.current.setValue("second")
      })

      expect(result.current.debouncedValue).toBe("first") // Still old

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
      })

      expect(result.current.debouncedValue).toBe("second")
      expect(mockStorageItem.setValue).toHaveBeenCalledWith("second")
    })
  })
})
