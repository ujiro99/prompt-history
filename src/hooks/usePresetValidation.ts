import { useState, useEffect, useRef, useCallback } from "react"
import type { VariablePreset } from "@/types/prompt"
import { validateField, type FieldErrors } from "@/schemas/variablePreset"

/**
 * Field handler for validation
 */
export interface FieldHandler {
  onChange: (value: string) => void
  onBlur: () => void
  error: string | undefined
}

/**
 * Result of usePresetValidation hook
 */
export interface UsePresetValidationResult {
  errors: FieldErrors
  setErrors: React.Dispatch<React.SetStateAction<FieldErrors>>
  createFieldHandler: (fieldKey: string) => FieldHandler
  hasErrors: boolean
}

/**
 * Custom hook for preset validation
 * Manages validation state and provides field handlers
 *
 * @param preset - Current preset being edited
 * @param allPresets - All presets for duplicate checking
 * @param onValidationChange - Callback when validation state changes
 * @returns Validation state and field handler factory
 */
export function usePresetValidation(
  preset: VariablePreset | null,
  allPresets: VariablePreset[],
  onValidationChange?: (hasErrors: boolean) => void,
): UsePresetValidationResult {
  const [errors, setErrors] = useState<FieldErrors>({})
  const presetRef = useRef(preset)

  // Clear errors when preset changes (switching between presets)
  useEffect(() => {
    if (presetRef.current?.id !== preset?.id) {
      setErrors({})
    }
    presetRef.current = preset
  }, [preset])

  // Notify parent of validation state changes
  useEffect(() => {
    if (!preset) {
      onValidationChange?.(false)
      return
    }

    const hasErrors = Object.keys(errors).length > 0
    onValidationChange?.(hasErrors)
  }, [errors, preset, onValidationChange])

  // Create field handler for a specific field
  const createFieldHandler = useCallback(
    (fieldKey: string): FieldHandler => {
      return {
        onChange: (_value: string) => {
          // Only validate if there's an existing error
          if (errors[fieldKey] && preset) {
            const error = validateField(preset, fieldKey, allPresets)
            if (!error) {
              setErrors((prev) => {
                const next = { ...prev }
                delete next[fieldKey]
                return next
              })
            }
          }
        },
        onBlur: () => {
          // Always validate on blur
          if (!preset) return
          const error = validateField(preset, fieldKey, allPresets)
          setErrors((prev) => {
            const next = { ...prev }
            if (error) {
              next[fieldKey] = error
            } else {
              delete next[fieldKey]
            }
            return next
          })
        },
        error: errors[fieldKey],
      }
    },
    [preset, allPresets, errors],
  )

  const hasErrors = Object.keys(errors).length > 0

  return { errors, setErrors, createFieldHandler, hasErrors }
}
