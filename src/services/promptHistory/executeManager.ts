import type { AIServiceInterface } from "../../types/aiService"
import type { Prompt, VariableValues } from "../../types/prompt"
import type { StorageService } from "../storage"
import { SessionManager } from "./sessionManager"
import { replaceTextAtCaret, setElementText } from "@/services/dom/inputUtils"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"
import { expandPrompt } from "@/utils/variables/variableFormatter"
import { analyticsService, ANALYTICS_EVENTS } from "@/services/analytics"

/**
 * Class responsible for prompt execution and UI support processing (Storage read operations)
 *
 * ## Methods Overview
 *
 * ### insertPrompt vs setPrompt vs replaceText
 *
 * | Feature             | insertPrompt             | setPrompt                | replaceText              |
 * |---------------------|--------------------------|--------------------------|--------------------------|
 * | Input               | `promptId: string`       | `content: string`        | `AutoCompleteMatch`      |
 * | Storage reference   | ✓ Required               | ✗ Not required           | ✗ Not required           |
 * | Variable expansion  | ✓ Supported              | ✓ Supported              | ✗ Not supported          |
 * | Session management  | ✓ Tracked                | ✗ Not tracked            | ✗ Not tracked            |
 * | Execution count     | ✓ Incremented            | ✗ Not incremented        | ✗ Not incremented        |
 * | Analytics           | ✓ "insert-prompt" event  | ✓ "set-prompt" event     | ✗ None                   |
 * | Use case            | Insert saved prompts     | Set arbitrary text       | Replace text at caret    |
 */
export class ExecuteManager {
  constructor(
    private storage: StorageService,
    private sessionManager: SessionManager,
  ) {}

  /**
   * Insert prompt into text input
   */
  async insertPrompt(
    promptId: string,
    aiService: AIServiceInterface,
    nodeAtCaret: Node | null,
    options?: {
      match?: AutoCompleteMatch
      variableValues?: VariableValues
    },
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const prompt = await this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      let content = prompt.content
      if (
        options?.variableValues &&
        Object.values(options.variableValues).some((v) => v !== "")
      ) {
        // Expand prompt content with variable values if provided
        content = expandPrompt(prompt.content, options.variableValues)
      } else {
        // Add a space to prevent the art complete message from reappearing.
        content = content + " "
      }

      // Inject prompt into AI service
      const textInput = aiService.getTextInput()
      if (textInput) {
        // Create or update match with expanded content
        const _match: AutoCompleteMatch = options?.match
          ? {
              ...options.match,
              content,
            }
          : {
              id: prompt.id,
              name: prompt.name,
              content,
              isPinned: prompt.isPinned,
              matchStart: 0,
              matchEnd: content.length,
              newlineCount: 0,
              searchTerm: "",
              matchType: "prompt" as const,
            }

        // Execute text replacement at caret
        await replaceTextAtCaret(
          textInput,
          _match,
          nodeAtCaret,
          aiService.legacyMode,
        )
      }

      // Start session
      await this.sessionManager.startSession(promptId)

      // Increment execution count
      await this.storage.incrementExecutionCount(promptId, window.location.href)

      // Get updated prompt to pass to callback
      const updatedPrompt = await this.storage.getPrompt(promptId)
      if (!updatedPrompt) {
        throw new Error(`Failed to retrieve updated prompt: ${promptId}`)
      }

      onSuccess?.(updatedPrompt)
      await analyticsService.track(ANALYTICS_EVENTS.INSERT_PROMPT)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Insert failed")
      onError?.(err)
    }
  }

  /**
   * Set prompt text directly into text input
   */
  async setPrompt(
    content: string,
    aiService: AIServiceInterface,
    options?: {
      variableValues?: VariableValues
    },
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      let finalContent = content
      if (
        options?.variableValues &&
        Object.values(options.variableValues).some((v) => v !== "")
      ) {
        // Expand prompt content with variable values if provided
        finalContent = expandPrompt(content, options.variableValues)
      } else {
        // Add a space to prevent the autocomplete message from reappearing
        finalContent = content + " "
      }

      // Inject text into AI service
      const textInput = aiService.getTextInput()
      if (textInput) {
        // Execute text replacement
        await setElementText(textInput, finalContent, aiService.legacyMode)
      }

      onSuccess?.()
      await analyticsService.track(ANALYTICS_EVENTS.SET_PROMPT)
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Set prompt failed")
      onError?.(err)
    }
  }

  /**
   * Replace text at caret position using AutoCompleteMatch
   * This is a generic text replacement method that doesn't involve storage operations.
   */
  async replaceText(
    match: AutoCompleteMatch,
    aiService: AIServiceInterface,
    nodeAtCaret: Node | null,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const textInput = aiService.getTextInput()
      if (textInput) {
        await replaceTextAtCaret(
          textInput,
          match,
          nodeAtCaret,
          aiService.legacyMode,
        )
      }

      onSuccess?.()
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Replace text failed")
      onError?.(err)
    }
  }
}
