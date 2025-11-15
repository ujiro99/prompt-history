import { useState, useCallback } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { useSettings } from "@/hooks/useSettings"
import type { VariableConfig, VariableValues } from "@/types/prompt"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"
import { mergeVariableConfigs } from "@/utils/variables/variableParser"

const serviceFacade = PromptServiceFacade.getInstance()

/**
 * Variable input data
 */
export interface VariableInputData {
  promptId: string
  variables: VariableConfig[]
  content: string
  match?: AutoCompleteMatch
  nodeAtCaret?: Node | null
}

/**
 * Options for usePromptExecution hook
 */
export interface UsePromptExecutionOptions {
  /** Node at caret position for prompt execution */
  nodeAtCaret?: Node | null
  /** Callback when execution starts */
  onExecuteStart?: () => void
  /** Callback when execution completes */
  onExecuteComplete?: () => void
}

/**
 * Return type for usePromptExecution hook
 */
export interface UsePromptExecutionReturn {
  /** Current variable input data */
  variableInputData: VariableInputData | null
  /** Insert a prompt into text input with optional match data */
  insertPrompt: (promptId: string, match?: AutoCompleteMatch) => Promise<void>
  /** Set prompt text directly into text input */
  setPrompt: (content: string) => Promise<void>
  /** Handle variable submission */
  handleVariableSubmit: (values: VariableValues) => Promise<void>
  /** Clear variable input data */
  clearVariableInputData: () => void
}

/**
 * Custom hook for prompt execution with variable support
 *
 * This hook provides a unified interface for executing prompts with variable expansion.
 * It handles variable detection, variable input dialog display, and prompt execution.
 */
export const usePromptExecution = (
  options: UsePromptExecutionOptions = {},
): UsePromptExecutionReturn => {
  const { nodeAtCaret, onExecuteStart, onExecuteComplete } = options
  const [variableInputData, setVariableInputData] =
    useState<VariableInputData | null>(null)
  const { settings } = useSettings()

  // Check if variable expansion is enabled (default: true)
  const variableExpansionEnabled = settings?.variableExpansionEnabled ?? true

  /**
   * Insert a prompt into text input, checking for variables first
   */
  const insertPrompt = useCallback(
    async (promptId: string, match?: AutoCompleteMatch) => {
      try {
        onExecuteStart?.()

        // Get prompt to check for variables
        const prompt = await serviceFacade.getPrompt(promptId)

        // Check if prompt has variables that need user input (only if variable expansion is enabled)
        const hasVariables = prompt.variables && prompt.variables.length > 0
        const hasInputVariables =
          hasVariables && prompt.variables!.some((v) => v.type !== "exclude")

        if (variableExpansionEnabled && hasInputVariables) {
          // Show variable input dialog
          setVariableInputData({
            promptId,
            variables: prompt.variables!,
            content: prompt.content,
            match,
            nodeAtCaret,
          })
        } else {
          // Insert directly if no variables or variable expansion is disabled
          await serviceFacade.insertPrompt(promptId, nodeAtCaret ?? null, {
            match,
          })
          onExecuteComplete?.()
        }
      } catch (error) {
        console.error("Insert failed:", error)
      }
    },
    [nodeAtCaret, onExecuteStart, onExecuteComplete, variableExpansionEnabled],
  )

  /**
   * Set prompt text directly into text input, checking for variables first
   */
  const setPrompt = useCallback(
    async (content: string) => {
      try {
        onExecuteStart?.()

        // Check if content has variables and variable expansion is enabled
        const variableMatches = content.match(/\{\{(\w+)\}\}/g)
        const hasVariables = variableMatches && variableMatches.length > 0

        if (variableExpansionEnabled && hasVariables) {
          // Parse variables from content
          const variables = mergeVariableConfigs(content)
          const hasInputVariables = variables.some((v) => v.type !== "exclude")

          if (hasInputVariables) {
            // Show variable input dialog
            setVariableInputData({
              promptId: "", // No promptId for raw text
              variables,
              content,
              match: undefined,
              nodeAtCaret,
            })
            return
          }
        }

        // Set directly if no variables or variable expansion is disabled
        await serviceFacade.setPrompt(content)
        onExecuteComplete?.()
      } catch (error) {
        console.error("Set prompt failed:", error)
      }
    },
    [nodeAtCaret, onExecuteStart, onExecuteComplete, variableExpansionEnabled],
  )

  /**
   * Handle variable input submission
   */
  const handleVariableSubmit = useCallback(
    async (values: VariableValues) => {
      if (!variableInputData) return

      try {
        const {
          promptId,
          content,
          match,
          nodeAtCaret: savedNodeAtCaret,
        } = variableInputData

        if (promptId) {
          // Use insertPrompt for stored prompts
          // Variable expansion and match creation are handled by insertManager
          await serviceFacade.insertPrompt(
            promptId,
            savedNodeAtCaret ?? nodeAtCaret ?? null,
            {
              match,
              variableValues: values,
            },
          )
        } else {
          // Use setPrompt for raw text content
          await serviceFacade.setPrompt(content, {
            variableValues: values,
          })
        }

        // Close the variable input dialog
        setVariableInputData(null)
        onExecuteComplete?.()
      } catch (error) {
        console.error("Variable submission failed:", error)
      }
    },
    [variableInputData, nodeAtCaret, onExecuteComplete],
  )

  /**
   * Clear variable input data
   */
  const clearVariableInputData = useCallback(() => {
    setVariableInputData(null)
  }, [])

  return {
    variableInputData,
    insertPrompt,
    setPrompt,
    handleVariableSubmit,
    clearVariableInputData,
  }
}
