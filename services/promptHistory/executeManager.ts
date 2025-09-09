import type { Prompt, AIServiceInterface } from "../../types/prompt"
import type { StorageService } from "../storage"
import { SessionManager } from "./sessionManager"

/**
 * Class responsible for prompt execution and UI support processing (Storage read operations)
 */
export class ExecuteManager {
  constructor(
    private storage: StorageService,
    private sessionManager: SessionManager,
  ) {}

  /**
   * Execute prompt
   */
  async executePrompt(
    promptId: string,
    aiService: AIServiceInterface,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const prompt = await this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      // Inject prompt into AI service
      await aiService.injectPromptContent(prompt.content)

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
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Execute failed")
      onError?.(err)
    }
  }
}
