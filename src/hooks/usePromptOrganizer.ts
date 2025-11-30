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
import {
  promptOrganizerSettingsStorage,
  pendingOrganizerTemplatesStorage,
} from "@/services/storage/definitions"
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
  const [pendingTemplates, setPendingTemplates] = useState<TemplateCandidate[]>(
    [],
  )
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

  // Load pending templates
  useEffect(() => {
    pendingOrganizerTemplatesStorage.getValue().then((pending) => {
      setPendingTemplates(pending?.templates || [])
    })
    return pendingOrganizerTemplatesStorage.watch((pending) => {
      setPendingTemplates(pending?.templates || [])
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
   *  @return Success status
   */
  const executeOrganization = async (): Promise<boolean> => {
    if (!settings) return false
    let ret = false

    setIsExecuting(true)
    setError(null)
    setProgress({
      chunk: "",
      accumulated: "",
      estimatedProgress: 0,
      status: "sending",
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

      // Append new templates to existing pending templates
      const existing = await pendingOrganizerTemplatesStorage.getValue()
      const existingTemplates = existing?.templates || []
      await pendingOrganizerTemplatesStorage.setValue({
        templates: [...existingTemplates, ...result.templates],
        generatedAt: Date.now(),
      })

      ret = true
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

    return ret
  }

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = () => {
    promptOrganizerService.cancel()
  }

  /**
   * Save templates (partial save supported)
   */
  const saveTemplates = async (candidates: TemplateCandidate[]) => {
    try {
      // Save only templates with "save" or "save_and_pin" action
      const templatesToSave = candidates.filter(
        (c) => c.userAction === "save" || c.userAction === "save_and_pin",
      )
      await promptOrganizerService.saveTemplates(templatesToSave)

      // Remove processed templates from pending storage
      const processedIds = new Set(
        candidates.filter((c) => c.userAction !== "pending").map((c) => c.id),
      )

      const existing = await pendingOrganizerTemplatesStorage.getValue()
      if (existing) {
        const remaining = existing.templates.filter(
          (t) => !processedIds.has(t.id),
        )

        if (remaining.length > 0) {
          // Keep unprocessed templates in pending state
          await pendingOrganizerTemplatesStorage.setValue({
            templates: remaining,
            generatedAt: existing.generatedAt,
          })
        } else {
          // Clear pending state if all templates are processed
          await pendingOrganizerTemplatesStorage.setValue(null)
        }
      }
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
    pendingTemplates,
    isExecuting,
    progress,
    error,
    executeOrganization,
    cancelGeneration,
    saveTemplates,
  }
}
