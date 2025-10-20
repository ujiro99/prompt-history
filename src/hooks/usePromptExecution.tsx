import { useState, useCallback } from "react"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import { expandPrompt } from "@/utils/variables/variableFormatter"
import type {
  VariableConfig,
  VariableValues,
} from "@/types/prompt"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"

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
  /** Execute a prompt with optional match data */
  executePrompt: (promptId: string, match?: AutoCompleteMatch) => Promise<void>
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

  /**
   * Execute a prompt, checking for variables first
   */
  const executePrompt = useCallback(
    async (promptId: string, match?: AutoCompleteMatch) => {
      try {
        onExecuteStart?.()

        // Get prompt to check for variables
        const prompt = await serviceFacade.getPrompt(promptId)

        // Check if prompt has variables that need user input
        const hasVariables = prompt.variables && prompt.variables.length > 0
        const hasInputVariables =
          hasVariables && prompt.variables!.some((v) => v.type !== "exclude")

        if (hasInputVariables) {
          // Show variable input dialog
          setVariableInputData({
            promptId,
            variables: prompt.variables!,
            content: prompt.content,
            match,
            nodeAtCaret,
          })
        } else {
          // Execute directly if no variables
          await serviceFacade.executePrompt(
            promptId,
            nodeAtCaret ?? null,
            match,
          )
          onExecuteComplete?.()
        }
      } catch (error) {
        console.error("Execute failed:", error)
      }
    },
    [nodeAtCaret, onExecuteStart, onExecuteComplete],
  )

  /**
   * Handle variable input submission
   */
  const handleVariableSubmit = useCallback(
    async (values: VariableValues) => {
      if (!variableInputData) return

      try {
        const { promptId, content, match, nodeAtCaret: savedNodeAtCaret } =
          variableInputData

        // Expand prompt with variable values
        const expandedContent = expandPrompt(content, values)

        // Create or update match object with expanded content
        let expandedMatch: AutoCompleteMatch | undefined
        if (match) {
          // Use existing match (autocomplete case)
          expandedMatch = {
            ...match,
            content: expandedContent,
          }
        } else {
          // Create new match (InputPopup case)
          const prompt = await serviceFacade.getPrompt(promptId)
          expandedMatch = {
            id: prompt.id,
            name: prompt.name,
            content: expandedContent,
            isPinned: prompt.isPinned,
            matchStart: 0,
            matchEnd: expandedContent.length,
            newlineCount: 0,
            searchTerm: "",
          }
        }

        // Execute the prompt with expanded content
        await serviceFacade.executePrompt(
          promptId,
          savedNodeAtCaret ?? nodeAtCaret ?? null,
          expandedMatch,
        )

        // Close the variable input dialog
        setVariableInputData(null)
        onExecuteComplete?.()
      } catch (error) {
        console.error("Variable expansion failed:", error)
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
    executePrompt,
    handleVariableSubmit,
    clearVariableInputData,
  }
}
