import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  createLazyStorage,
  type WxtStorageItemLike,
} from "@/services/storage/lazyStorage"

/**
 * React hook for lazy storage with automatic state synchronization and optional debouncing
 *
 * @param storageItem - The storage item to use
 * @param options - Options object
 *   - artificialSetDelay: Delay in milliseconds after debounce before writing to storage (default: 0)
 *   - debounceDelay: Delay in milliseconds to debounce setValue calls (default: 0)
 * @returns An object with the following properties:
 *   - value: Current value (updates immediately on setValue)
 *   - debouncedValue: Debounced value (updates after debounce delay, matches what will be saved to storage)
 *   - setValue: Function to update the value
 *   - isLoading: True when loading initial value from storage
 *   - isSaving: True when saving value to storage (including debounce wait time)
 *
 * @example Basic usage without debounce
 * ```typescript
 * const { value, setValue, isLoading, isSaving } = useLazyStorage(settingsStorage)
 * setValue({ theme: 'dark' }) // Writes immediately, value and debouncedValue update together
 * ```
 *
 * @example With debounce for text input
 * ```typescript
 * const { value, debouncedValue, setValue, isLoading, isSaving } = useLazyStorage(
 *   textStorage,
 *   { debounceDelay: 500 }
 * )
 * setValue("typing...") // value updates immediately, debouncedValue updates after 500ms
 * ```
 *
 * @example With both debounce and artificial delay
 * ```typescript
 * const { value, debouncedValue, setValue, isLoading, isSaving } = useLazyStorage(
 *   dataStorage,
 *   {
 *     debounceDelay: 300,        // Throttle rapid changes
 *     artificialSetDelay: 200    // Add delay after debounce
 *   }
 * )
 * // value: updates immediately
 * // debouncedValue: updates after 300ms
 * // storage write: happens at 300ms + 200ms = 500ms
 * ```
 */
export function useLazyStorage<T>(
  storageItem: WxtStorageItemLike<T>,
  options?: {
    artificialSetDelay?: number
    debounceDelay?: number
  },
) {
  const { artificialSetDelay = 0, debounceDelay = 0 } = options ?? {}
  const [value, setValue] = useState<T | null>(null)
  const [debouncedValue, setDebouncedValue] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Ref to track debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create lazy storage wrapper
  const lazyStorage = useMemo(
    () => createLazyStorage(storageItem, artificialSetDelay),
    [storageItem, artificialSetDelay],
  )

  // Load initial value
  useEffect(() => {
    let mounted = true

    lazyStorage.get().then((initialValue) => {
      if (mounted) {
        setValue(initialValue)
        setDebouncedValue(initialValue)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [lazyStorage])

  // Watch for changes
  useEffect(() => {
    return lazyStorage.watch((newValue: T) => {
      setValue(newValue)
      setDebouncedValue(newValue)
    })
  }, [lazyStorage])

  // Wrapped set function with debounce support
  const setLazyValue = useCallback(
    async (newValue: T | ((prevValue: T | null) => T)) => {
      // 1. Calculate the actual value to set
      const valueToSet =
        typeof newValue === "function"
          ? (newValue as (prevValue: T | null) => T)(value)
          : newValue

      // 2. Immediately update local state for responsive UI
      setValue(valueToSet)

      // 3. Set saving state
      setIsSaving(true)

      // 4. Clear any existing debounce timer
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      // 5. Debounce storage update if delay is configured
      if (debounceDelay > 0) {
        debounceTimerRef.current = setTimeout(async () => {
          setDebouncedValue(valueToSet)
          await lazyStorage.set(valueToSet)
          debounceTimerRef.current = null
          setIsSaving(false)
        }, debounceDelay)
      } else {
        // No debounce - update storage immediately
        setDebouncedValue(valueToSet)
        await lazyStorage.set(valueToSet)
        setIsSaving(false)
      }
    },
    [lazyStorage, value, debounceDelay],
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    value,
    debouncedValue,
    setValue: setLazyValue,
    isLoading,
    isSaving,
  }
}
