/**
 * Prompt Organizer Hook
 * State management for prompt organization feature
 */

import { useState, useEffect } from "react"
import { i18n } from "#imports"
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
import { successMessageGeneratorService } from "@/services/promptOrganizer/SuccessMessageGeneratorService"
import type { GeneratedTemplate } from "@/types/promptOrganizer"

interface UsePromptOrganizerOptions {
  /** Enable execution estimate calculation */
  enableEstimate?: boolean
}

/**
 * Extract the first complete template from partial JSON
 * @param accumulated - Accumulated JSON string
 * @returns First complete template or null
 */
function extractFirstCompleteTemplate(
  accumulated: string,
): GeneratedTemplate | null {
  // Find "prompts": [ marker
  const promptsMarker = '"prompts": ['
  const promptsIndex = accumulated.indexOf(promptsMarker)
  if (promptsIndex === -1) return null

  // Get text after "prompts": [
  const startIndex = promptsIndex + promptsMarker.length
  const remainingText = accumulated.substring(startIndex).trim()

  // Find the first complete object by counting braces
  let depth = 0
  let inString = false
  let escapeNext = false
  let firstObjectEnd = -1

  for (let i = 0; i < remainingText.length; i++) {
    const char = remainingText[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === "\\") {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === "{") {
        depth++
      } else if (char === "}") {
        depth--
        if (depth === 0) {
          firstObjectEnd = i
          break
        }
      }
    }
  }

  // If we found a complete object, try to parse it
  if (firstObjectEnd !== -1) {
    const firstObjectStr = remainingText.substring(0, firstObjectEnd + 1)
    try {
      const firstTemplate = JSON.parse(firstObjectStr)
      // Validate that it has required fields
      if (firstTemplate.title && firstTemplate.content) {
        return firstTemplate
      }
    } catch (error) {
      // Not valid JSON yet
      console.debug("Failed to parse first template:", error)
    }
  }

  return null
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
    setResult({
      successMessage: "",
      successMessageGenerated: false,
    } as PromptOrganizerResult)

    let successMessage: string = ""
    let successMessageGenerated = false
    const abortController = new AbortController()
    let isFirstTemplateProcessed = false

    try {
      const result = await promptOrganizerService.executeOrganization(
        settings,
        {
          onProgress: (progressInfo) => {
            setProgress(progressInfo)

            // Generate success message for the first template only
            if (!isFirstTemplateProcessed && progressInfo.accumulated) {
              const firstTemplate = extractFirstCompleteTemplate(
                progressInfo.accumulated,
              )

              if (firstTemplate) {
                isFirstTemplateProcessed = true

                // Generate success message asynchronously (background execution)
                successMessageGeneratorService
                  .generateSuccessMessage(firstTemplate, abortController.signal)
                  .then((message) => {
                    successMessage = message
                  })
                  .catch((err) => {
                    console.error("Failed to generate success message:", err)
                    // Fallback: default message
                    successMessage = i18n.t(
                      "promptOrganizer.summary.templateCreated",
                      [firstTemplate.title],
                    )
                  })
                  .finally(() => {
                    console.log("First template success message generated.")
                    successMessageGenerated = true
                  })
              }
            }
          },
        },
      )

      if (!successMessageGenerated && result.templates.length > 0) {
        console.log("Generating success message...")
        abortController.abort() // Cancel if still running
        successMessage =
          await successMessageGeneratorService.generateSuccessMessage(
            {
              ...result.templates[0],
              sourcePromptIds:
                result.templates[0].aiMetadata.sourcePromptIds || [],
            },
            undefined,
          )
        successMessageGenerated = true
      }

      // Add success message to result
      const resultWithMessage = {
        ...result,
        successMessage,
        successMessageGenerated,
      }
      console.log("Organization result:", resultWithMessage)
      setResult(resultWithMessage)

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
