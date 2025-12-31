/**
 * Mock WXT storage item type for Storybook
 */
export interface WxtStorageItemLike<T> {
  getValue: () => Promise<T>
  setValue: (value: T) => Promise<void>
  watch: (callback: (newValue: T, oldValue: T) => void) => () => void
  removeValue: () => Promise<void>
}

/**
 * Mock lazy storage wrapper interface
 */
export interface LazyStorageWrapper<T> {
  get: () => Promise<T>
  set: (value: T) => Promise<void>
  watch: (callback: (newValue: T, oldValue: T) => void) => () => void
  removeValue: () => Promise<void>
  getValue: () => Promise<T>
  setValue: (value: T) => Promise<void>
}

/**
 * Mock implementation of createLazyStorage for Storybook
 * Returns a no-op storage wrapper that doesn't interact with WXT storage
 */
export function createLazyStorage<T>(
  _storageItem: WxtStorageItemLike<T>,
  _artificialSetDelay: number = 0,
): LazyStorageWrapper<T> {
  // Mock initial value
  let mockValue: T = {
    mode: "url",
    textContent: "",
    urlContent: "",
    lastModified: Date.now(),
  } as T

  return {
    get: async () => {
      console.log("Mock: lazyStorage.get called")
      return mockValue
    },
    set: async (value: T) => {
      console.log("Mock: lazyStorage.set called with:", value)
      mockValue = value
    },
    watch: (_callback: (newValue: T, oldValue: T) => void) => {
      console.log("Mock: lazyStorage.watch called")
      // Return a no-op unsubscribe function
      return () => {
        console.log("Mock: lazyStorage.watch unsubscribe called")
      }
    },
    removeValue: async () => {
      console.log("Mock: lazyStorage.removeValue called")
    },
    getValue: async () => {
      console.log("Mock: lazyStorage.getValue called")
      return mockValue
    },
    setValue: async (value: T) => {
      console.log("Mock: lazyStorage.setValue called with:", value)
      mockValue = value
    },
  }
}
