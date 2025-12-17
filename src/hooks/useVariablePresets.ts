import { useState, useEffect } from "react"
import type { VariablePreset } from "@/types/prompt"
import {
  getVariablePresets,
  watchVariablePresets,
  watchVariablePreset,
} from "@/services/storage/variablePresetStorage"

/**
 * Options for useVariablePresets hook
 */
interface UseVariablePresetsOptions {
  /** Optional preset ID to watch a specific preset */
  presetId?: string
  /** Enable/disable watching (default: true) */
  enabled?: boolean
}

/**
 * Return value for useVariablePresets hook
 */
interface UseVariablePresetsReturn {
  /** All presets (null if presetId is specified or still loading) */
  presets: VariablePreset[] | null
  /** Single preset (null if presetId is not specified or preset not found) */
  preset: VariablePreset | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
}

/**
 * Custom hook to watch variable presets changes
 *
 * @param options - Hook options
 * @returns Variable presets data and loading state
 *
 * @example
 * // Watch all presets
 * const { presets } = useVariablePresets()
 *
 * @example
 * // Watch specific preset
 * const { preset } = useVariablePresets({ presetId: 'preset-id' })
 *
 * @example
 * // Only watch when dialog is open
 * const { presets } = useVariablePresets({ enabled: open })
 */
export function useVariablePresets(
  options: UseVariablePresetsOptions = {},
): UseVariablePresetsReturn {
  const { presetId, enabled = true } = options

  const [presets, setPresets] = useState<VariablePreset[] | null>(null)
  const [preset, setPreset] = useState<VariablePreset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let mounted = true

    if (presetId) {
      // Watch specific preset
      // Initial load
      getVariablePresets()
        .then((loaded) => {
          if (!mounted) return
          const preset = loaded.find((p) => p.id === presetId)
          setPreset(preset || null)
          setIsLoading(false)
        })
        .catch((err) => {
          if (!mounted) return
          setError(err as Error)
          setIsLoading(false)
        })

      // Watch for changes
      const unwatch = watchVariablePreset(presetId, (updated) => {
        if (!mounted) return
        setPreset(updated)
      })

      return () => {
        mounted = false
        unwatch()
      }
    } else {
      // Watch all presets
      // Initial load
      getVariablePresets()
        .then((loaded) => {
          if (!mounted) return
          setPresets(loaded)
          setIsLoading(false)
        })
        .catch((err) => {
          if (!mounted) return
          setError(err as Error)
          setIsLoading(false)
        })

      // Watch for changes
      const unwatch = watchVariablePresets((updated) => {
        if (!mounted) return
        setPresets(updated)
      })

      return () => {
        mounted = false
        unwatch()
      }
    }
  }, [presetId, enabled])

  return { presets, preset, isLoading, error }
}
