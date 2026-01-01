/**
 * Mock implementation of wxt/storage for Storybook
 * This prevents "must be loaded in a web extension environment" errors
 */

// Storage for mock values set by stories
const mockStorage: Record<string, unknown> = {}

export const storage = {
  defineItem: (
    key: string,
    options?: { fallback?: unknown; version?: number; migrations?: unknown },
  ) => {
    console.log(`Mock: storage.defineItem called for key: ${key}`)

    return {
      key,
      fallback: options?.fallback,
      getValue: async () => {
        console.log(`Mock: getValue called for ${key}`)
        // Return mock value if set, otherwise fallback
        if (key in mockStorage) {
          return mockStorage[key]
        }
        return options?.fallback ?? null
      },
      setValue: async (value: unknown) => {
        console.log(`Mock: setValue called for ${key}`, value)
        mockStorage[key] = value
      },
      watch: (_callback?: (value: unknown) => void) => {
        console.log(`Mock: watch called for ${key}`)
        return () => {}
      },
    }
  },
}

// Export function to set mock values for testing
export const setMockStorageValue = (key: string, value: unknown) => {
  mockStorage[key] = value
}

// Export function to clear mock storage
export const clearMockStorage = () => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
}
