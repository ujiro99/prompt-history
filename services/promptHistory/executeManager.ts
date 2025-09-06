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
      aiService.injectPromptContent(prompt.content)

      // Start session
      await this.sessionManager.startSession(promptId)

      // Increment execution count
      await this.storage.incrementExecutionCount(promptId, window.location.href)

      onSuccess?.(prompt)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Execute failed")
      onError?.(err)
    }
  }

  /**
   * Get prompt list (sorted)
   */
  async getPrompts(): Promise<Prompt[]> {
    const prompts = await this.storage.getAllPrompts()
    const settings = this.storage.getSettings()
    console.debug("Loaded prompts:", prompts)

    // Sort processing
    switch (settings.defaultSortOrder) {
      case "recent":
        return prompts.sort(
          (a, b) => b.lastExecutedAt.getTime() - a.lastExecutedAt.getTime(),
        )
      case "execution":
        return prompts.sort((a, b) => b.executionCount - a.executionCount)
      case "name":
        return prompts.sort((a, b) => a.name.localeCompare(b.name))
      default:
        return prompts
    }
  }

  /**
   * Get pinned prompts (maintaining order)
   */
  async getPinnedPrompts(): Promise<Prompt[]> {
    const pinnedOrder = await this.storage.getPinnedOrder()
    const prompts = await this.storage.getAllPrompts()

    return pinnedOrder
      .map((id) => prompts.find((p) => p.id === id))
      .filter((p): p is Prompt => Boolean(p))
  }

  /**
   * Get settings
   */
  getSettings() {
    return this.storage.getSettings()
  }
}
