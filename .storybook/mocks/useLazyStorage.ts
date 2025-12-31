import { useState, useEffect } from "react"

/**
 * Mock implementation of useLazyStorage hook for Storybook
 * Simulates the behavior without requiring WXT storage API
 *
 * Note: To customize mock data for specific stories, you can modify the
 * initial state by passing different storage items or using decorators.
 */
export function useLazyStorage<T>(
  _storageItem: unknown,
  _options?: {
    debounceDelay?: number
    artificialSetDelay?: number
  },
) {
  // Default mock data
  const [value, setValue] = useState<T | null>(null)
  const [debouncedValue, setDebouncedValue] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Simulate initial load
  useEffect(() => {
    // Check if window has mock data set by story decorator
    const windowWithMock = window as Window & {
      __STORYBOOK_MOCK_DATA__?: Partial<T>
    }

    // Set default mock values based on storage item type
    const defaultValue = {
      mode: "url",
      textContent: "",
      urlContent: "",
      lastModified: Date.now(),
    }

    // Merge with story-specific mock data if provided via window
    const mockValue = {
      ...defaultValue,
      ...(windowWithMock.__STORYBOOK_MOCK_DATA__ || {}),
    } as T

    setValue(mockValue)
    setDebouncedValue(mockValue)
    setIsLoading(false)

    // Cleanup on unmount
    return () => {
      delete windowWithMock.__STORYBOOK_MOCK_DATA__
    }
  }, [])

  const setLazyValue = async (
    newValue: T | null | ((prevValue: T | null) => T | null),
  ) => {
    const valueToSet =
      typeof newValue === "function"
        ? (newValue as (prevValue: T | null) => T | null)(value)
        : newValue

    setValue(valueToSet)
    setDebouncedValue(valueToSet)

    // Simulate save delay
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 100))
    setIsSaving(false)

    console.log("Mock: useLazyStorage setValue called with:", valueToSet)
  }

  return {
    value,
    debouncedValue,
    setValue: setLazyValue,
    isLoading,
    isSaving,
  }
}
