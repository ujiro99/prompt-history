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
   * Execute organization
   */
  const executeOrganization = async () => {
    if (!settings) return

    setIsExecuting(true)
    setError(null)

    try {
      const result = await promptOrganizerService.executeOrganization(settings)
      setResult(result)
    } catch (err) {
      setError({
        code: "API_ERROR",
        message: (err as Error).message,
      })
    } finally {
      setIsExecuting(false)
    }
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
    error,
    executeOrganization,
    saveTemplates,
  }
}
