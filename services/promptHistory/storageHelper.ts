import type {
  Prompt,
  SaveDialogData,
  AIServiceInterface,
} from "../../types/prompt"
import type { StorageService } from "../storage"
import { SessionManager } from "./sessionManager"

/**
 * Class responsible for prompt save and delete operations (Storage write operations)
 */
export class StorageHelper {
  private saveInProgress = false

  constructor(
    private storage: StorageService,
    private sessionManager: SessionManager,
  ) {}

  /**
   * Manual prompt save
   */
  async savePromptManually(
    saveData: SaveDialogData,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<Prompt | null> {
    if (this.saveInProgress) {
      const error = new Error("Save operation already in progress")
      onError?.(error)
      return null
    }

    this.saveInProgress = true

    try {
      let savedPrompt: Prompt

      if (saveData.saveMode === "overwrite") {
        const session = this.sessionManager.getCurrentSession()
        if (!session?.activePromptId) {
          throw new Error("No active session for overwrite")
        }

        savedPrompt = await this.storage.updatePrompt(session.activePromptId, {
          name: saveData.name,
          content: saveData.content,
          isPinned: true, // Manual saves are automatically pinned
        })
      } else {
        savedPrompt = await this.storage.savePrompt({
          name: saveData.name,
          content: saveData.content,
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: true, // Manual saves are automatically pinned
          lastExecutionUrl: window.location.href,
        })
      }

      // Pin processing
      if (savedPrompt.isPinned) {
        await this.storage.pinPrompt(savedPrompt.id)
      }

      onSuccess?.(savedPrompt)
      return savedPrompt
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error")
      onError?.(err)
      return null
    } finally {
      this.saveInProgress = false
    }
  }

  /**
   * Auto prompt save (on send)
   */
  async handleAutoSave(
    aiService: AIServiceInterface,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    console.debug("Auto-save triggered")

    if (!this.storage.getSettings().autoSaveEnabled) {
      return
    }

    try {
      const content = aiService.extractPromptContent()?.trim()
      if (!content || content.length === 0) {
        return
      }

      // Save as new prompt (regardless of session state)
      const savedPrompt = await this.storage.savePrompt({
        name: this.generatePromptName(content),
        content,
        executionCount: 1,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: window.location.href,
      })

      // If session exists, also increment execution count of original prompt
      const session = this.sessionManager.getCurrentSession()
      if (session?.activePromptId) {
        await this.storage.incrementExecutionCount(
          session.activePromptId,
          window.location.href,
        )
      }

      onSuccess?.(savedPrompt)
      console.debug("Auto-saved prompt:", savedPrompt.name)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Auto-save failed")
      onError?.(err)
      console.warn("Auto-save failed:", error)
    }
  }

  /**
   * Delete prompt
   */
  async deletePrompt(
    promptId: string,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const prompt = await this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      // End session if it's an active session
      const session = this.sessionManager.getCurrentSession()
      if (session?.activePromptId === promptId) {
        await this.sessionManager.endSession()
      }

      await this.storage.deletePrompt(promptId)
      onSuccess?.(prompt)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Delete failed")
      onError?.(err)
    }
  }

  /**
   * Pin prompt
   */
  async pinPrompt(promptId: string): Promise<void> {
    await this.storage.pinPrompt(promptId)
  }

  /**
   * Unpin prompt
   */
  async unpinPrompt(promptId: string): Promise<void> {
    await this.storage.unpinPrompt(promptId)
  }

  /**
   * Prepare data for save dialog
   */
  async prepareSaveDialogData(aiService: AIServiceInterface | null): Promise<{
    initialContent: string
    isOverwriteAvailable: boolean
    initialName?: string
  }> {
    const content = aiService?.extractPromptContent()?.trim() || ""
    const session = this.sessionManager.getCurrentSession()
    const isOverwriteAvailable = Boolean(session?.activePromptId)

    let initialName: string | undefined
    if (session?.activePromptId) {
      const activePrompt = await this.storage.getPrompt(session.activePromptId)
      initialName = activePrompt?.name
    }

    return {
      initialContent: content,
      isOverwriteAvailable,
      initialName,
    }
  }

  /**
   * Auto-generate prompt name
   */
  private generatePromptName(content: string): string {
    const maxLength = 50
    const cleanContent = content.replace(/\s+/g, " ").trim()

    if (cleanContent.length <= maxLength) {
      return cleanContent
    }

    return cleanContent.substring(0, maxLength - 3) + "..."
  }
}
