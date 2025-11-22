/**
 * Prompt Organizer Hook
 * State management for prompt organization feature
 */

import { useState, useEffect } from "react"
import type {
  PromptOrganizerSettings,
  OrganizerExecutionEstimate,
  PromptOrganizerResult,
  OrganizerError,
  TemplateCandidate,
} from "@/types/promptOrganizer"
import { promptOrganizerSettingsStorage } from "@/services/storage/definitions"
import { promptOrganizerService } from "@/services/promptOrganizer/PromptOrganizerService"

/**
 * Prompt Organizer Hook
 */
export function usePromptOrganizer() {
  const [settings, setSettings] = useState<PromptOrganizerSettings | null>(null)
  const [estimate, setEstimate] = useState<OrganizerExecutionEstimate | null>(
    null,
  )
  const [result, setResult] = useState<PromptOrganizerResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<OrganizerError | null>(null)

  // Load settings
  useEffect(() => {
    promptOrganizerSettingsStorage.getValue().then(setSettings)
  }, [])

  // Recalculate estimate when settings change
  useEffect(() => {
    if (!settings) return

    promptOrganizerService
      .estimateExecution(settings)
      .then(setEstimate)
      .catch(console.error)
  }, [settings])

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
