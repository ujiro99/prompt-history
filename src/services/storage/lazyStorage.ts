/**
 * WXT storage item type (inferred from storage.defineItem return type)
 */
export interface WxtStorageItemLike<T> {
  getValue: () => Promise<T>
  setValue: (value: T) => Promise<void>
  watch: (callback: (newValue: T, oldValue: T) => void) => () => void
  removeValue: () => Promise<void>
}

/**
 * Lazy storage wrapper interface
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
 * Creates a lazy storage wrapper that delays write operations
 *
 * @param storageItem - The storage item to wrap
 * @param artificialSetDelay - Delay in milliseconds before writing to storage (default: 0)
 * @returns A wrapped storage interface with lazy write capability
 *
 * @example
 * ```typescript
 * const lazySettings = createLazyStorage(settingsStorage, 500)
 * await lazySettings.set({ theme: 'dark' }) // Writes after 500ms delay
 * ```
 */
export function createLazyStorage<T>(
  storageItem: WxtStorageItemLike<T>,
  artificialSetDelay: number = 0,
): LazyStorageWrapper<T> {
  return {
    get: () => {
      return storageItem.getValue()
    },
    set: async (value: T) => {
      const promises: Promise<void | T>[] = []
      if (artificialSetDelay > 0) {
        promises.push(
          new Promise((resolve) => setTimeout(resolve, artificialSetDelay)),
        )
      }
      promises.push(storageItem.setValue(value))
      await Promise.all(promises)
    },
    watch: (callback: (newValue: T, oldValue: T) => void) => {
      return storageItem.watch(callback)
    },
    removeValue: () => {
      return storageItem.removeValue()
    },
    getValue: () => {
      return storageItem.getValue()
    },
    setValue: async (value: T) => {
      return storageItem.setValue(value)
    },
  }
}
