import { useState, useEffect } from "react"

/**
 * Mock implementation of useLazyStorage hook for Storybook
 * Simulates the behavior without requiring WXT storage API
 *
 * Note: To customize mock data for specific stories, you can modify the
 * initial state by passing different storage items or using decorators.
 */
export function useLazyStorage<T>(
  storageItem: { getValue: () => Promise<T> },
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
    const loadInitialValue = async () => {
      // Check if window has mock data set by story decorator
      const windowWithMock = window as Window & {
        __STORYBOOK_MOCK_DATA__?: Partial<T>
      }

      try {
        // Get default value from the mock storage item
        const defaultValue = await storageItem.getValue()

        // Merge with story-specific mock data if provided via window
        const mockValue = {
          ...defaultValue,
          ...(windowWithMock.__STORYBOOK_MOCK_DATA__ || {}),
        } as T

        setValue(mockValue)
        setDebouncedValue(mockValue)
      } catch (error) {
        console.error("Failed to load initial value:", error)
        setValue(null)
        setDebouncedValue(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialValue()

    // Cleanup on unmount
    return () => {
      const windowWithMock = window as Window & {
        __STORYBOOK_MOCK_DATA__?: Partial<T>
      }
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
