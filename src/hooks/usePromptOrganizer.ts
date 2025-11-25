/**
 * Prompt Organizer Hook
 * State management for prompt organization feature
 */

import { useState, useEffect } from "react"
import { useDebounce } from "./useDebounce"
import type {
  PromptOrganizerSettings,
  OrganizerExecutionEstimate,
  PromptOrganizerResult,
  OrganizerError,
  TemplateCandidate,
  GenerationProgress,
} from "@/types/promptOrganizer"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"

interface UsePromptOrganizerOptions {
  /** Enable execution estimate calculation */
  enableEstimate?: boolean
}

/**
 * Prompt Organizer Hook
 */
export function usePromptOrganizer({
  enableEstimate = false,
}: UsePromptOrganizerOptions) {
  const [settings, setSettings] = useState<PromptOrganizerSettings | null>(null)
  const [estimate, setEstimate] = useState<OrganizerExecutionEstimate | null>(
    null,
  )
  const [result, setResult] = useState<PromptOrganizerResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [error, setError] = useState<OrganizerError | null>(null)

  const debouncedSettings = useDebounce(settings, 200)

  // Load settings
  useEffect(() => {
    promptOrganizerSettingsStorage.getValue().then(setSettings)
    return promptOrganizerSettingsStorage.watch((newSettings) => {
      setSettings(newSettings)
    })
  }, [])

  // Recalculate estimate when settings change
  useEffect(() => {
    if (!enableEstimate) return
    if (!debouncedSettings) return

    promptOrganizerService
      .estimateExecution(debouncedSettings)
      .then(setEstimate)
      .catch(console.error)
  }, [debouncedSettings, enableEstimate])

  /**
   * Execute organization with streaming progress
   */
  const executeOrganization = async () => {
    if (!settings) return

    setIsExecuting(true)
    setError(null)
    setProgress({
      chunk: "",
      accumulated: "",
      estimatedProgress: 0,
      status: "generating",
    })

    try {
      const result = await promptOrganizerService.executeOrganization(
        settings,
        {
          onProgress: (progressInfo) => {
            setProgress(progressInfo)
          },
        },
      )
      setResult(result)
    } catch (err) {
      const errorMessage = (err as Error).message
      if (errorMessage.includes("cancelled")) {
        setError({
          code: "CANCELLED",
          message: "Generation cancelled by user",
        })
      } else {
        setError({
          code: "API_ERROR",
          message: errorMessage,
        })
      }
    } finally {
      setIsExecuting(false)
      setProgress(null)
    }
  }

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = () => {
    promptOrganizerService.cancel()
  }

  /**
   * Save templates
   */
  const saveTemplates = async (candidates: TemplateCandidate[]) => {
    try {
      await promptOrganizerService.saveTemplates(candidates)
    } catch (err) {
      setError({
        code: "API_ERROR",
        message: (err as Error).message,
      })
    }
  }

  return {
    settings,
    estimate,
    result,
    isExecuting,
    progress,
    error,
    executeOrganization,
    cancelGeneration,
    saveTemplates,
  }
}
