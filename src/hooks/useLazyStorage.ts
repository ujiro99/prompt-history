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
 *   - setValue: Function to update the value (accepts T | null or a function (prevValue: T | null) => T | null)
 *   - isLoading: True when loading initial value from storage
 *   - isSaving: True when saving value to storage (not including debounce wait time)
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
 *
 * @example With function updater
 * ```typescript
 * const { value, setValue } = useLazyStorage(settingsStorage)
 * setValue((prev) => {
 *   if (!prev) return prev  // Can return null to skip update
 *   return { ...prev, updated: true }
 * })
 * ```
 */
export function useLazyStorage<T>(
  storageItem: WxtStorageItemLike<T>,
  options?: {
    debounceDelay?: number
    artificialSetDelay?: number
  },
) {
  const { debounceDelay = 0, artificialSetDelay = 0 } = options ?? {}
  const [value, setValue] = useState<T | null>(null)
  const [debouncedValue, setDebouncedValue] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Ref to track debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref to track if we are actually writing to storage (not just debouncing)
  const isWritingRef = useRef(false)

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
      // Prevent overwriting local changes during actual storage write
      if (isWritingRef.current) return
      console.log("Storage value changed:", newValue)
      setValue(newValue)
      setDebouncedValue(newValue)
    })
  }, [lazyStorage])

  // Wrapped set function with debounce support
  const setLazyValue = useCallback(
    async (newValue: T | null | ((prevValue: T | null) => T | null)) => {
      // 1. Calculate the actual value to set
      const valueToSet =
        typeof newValue === "function"
          ? (newValue as (prevValue: T | null) => T | null)(value)
          : newValue

      // 2. Immediately update local state for responsive UI
      setValue(valueToSet)

      // 3. Clear any existing debounce timer
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      // 4. Debounce storage update if delay is configured
      if (debounceDelay > 0) {
        debounceTimerRef.current = setTimeout(async () => {
          setIsSaving(true)
          isWritingRef.current = true
          setDebouncedValue(valueToSet)
          if (valueToSet !== null) {
            await lazyStorage.set(valueToSet)
          }
          isWritingRef.current = false
          debounceTimerRef.current = null
          setIsSaving(false)
        }, debounceDelay)
      } else {
        // No debounce - update storage immediately
        setIsSaving(true)
        isWritingRef.current = true
        setDebouncedValue(valueToSet)
        if (valueToSet !== null) {
          await lazyStorage.set(valueToSet)
        }
        isWritingRef.current = false
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
