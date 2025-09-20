import type { AIServiceInterface } from "../../types/aiService"
import type { Prompt } from "../../types/prompt"
import type { StorageService } from "../storage"
import { SessionManager } from "./sessionManager"
import { replaceTextAtCaret } from "@/services/dom/inputUtils"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"
import { analytics } from "#imports"

/**
 * Class responsible for prompt execution and UI support processing (Storage read operations)
 */
export class ExecuteManager {
  constructor(
    private storage: StorageService,
    private sessionManager: SessionManager,
  ) { }

  /**
   * Execute prompt
   */
  async executePrompt(
    promptId: string,
    aiService: AIServiceInterface,
    nodeAtCaret: Node | null,
    match?: AutoCompleteMatch,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const prompt = await this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      // Inject prompt into AI service
      const textInput = aiService.getTextInput()
      if (textInput) {
        const _match =
          match ??
          ({
            name: prompt.name,
            content: prompt.content,
            matchStart: 0,
            matchEnd: prompt.content.length,
            searchTerm: "",
          } as AutoCompleteMatch)

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
      await analytics.track("execute-prompt")
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Execute failed")
      onError?.(err)
    }
  }
}
