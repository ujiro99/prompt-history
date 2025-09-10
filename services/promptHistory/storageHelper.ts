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
   * Get single prompt by ID
   */
  async getPrompt(promptId: string): Promise<Prompt> {
    const prompt = await this.storage.getPrompt(promptId)
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`)
    }
    return prompt
  }

  /**
   * Get prompt list (sorted)
   */
  async getPrompts(): Promise<Prompt[]> {
    const prompts = await this.storage.getAllPrompts()
    return this.applySort(prompts)
  }

  /**
   * Get pinned prompts (applying sort order)
   */
  async getPinnedPrompts(): Promise<Prompt[]> {
    const pinnedOrder = await this.storage.getPinnedOrder()
    const prompts = await this.storage.getAllPrompts()

    const pinnedPrompts = pinnedOrder
      .map((id) => prompts.find((p) => p.id === id))
      .filter((p): p is Prompt => Boolean(p))

    return this.applySort(pinnedPrompts)
  }

  /**
   * Apply sort order to prompts array
   */
  private applySort(prompts: Prompt[]): Prompt[] {
    const settings = this.storage.getSettings()

    switch (settings.defaultSortOrder) {
      case "recent":
        return prompts.sort(
          (a, b) => b.lastExecutedAt.getTime() - a.lastExecutedAt.getTime(),
        )
      case "execution":
        return prompts.sort((a, b) => b.executionCount - a.executionCount)
      case "name":
        return prompts.sort((a, b) => a.name.localeCompare(b.name))
      case "composite":
        return prompts.sort(
          (a, b) =>
            this.calculateCompositeScore(b) - this.calculateCompositeScore(a),
        )
      default:
        return prompts
    }
  }

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
        const session = await this.sessionManager.getCurrentSession()
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
      const session = await this.sessionManager.getCurrentSession()
      if (session?.activePromptId) {
        await this.storage.incrementExecutionCount(
          session.activePromptId,
          window.location.href,
        )
      }

      onSuccess?.(savedPrompt)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Auto-save failed")
      onError?.(err)
      console.warn("Auto-save failed:", error)
    }
  }

  async updatePrompt(
    promptId: string,
    updates: Partial<Omit<Prompt, "id" | "createdAt">>,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    if (this.saveInProgress) {
      const error = new Error("Save operation already in progress")
      onError?.(error)
      return
    }

    this.saveInProgress = true

    try {
      const prompt = await this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      const updatedPrompt = await this.storage.updatePrompt(promptId, updates)

      // Pin processing
      if (updates.isPinned !== undefined) {
        if (updates.isPinned) {
          await this.storage.pinPrompt(promptId)
        } else {
          await this.storage.unpinPrompt(promptId)
        }
      }

      onSuccess?.(updatedPrompt)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Update failed")
      onError?.(err)
    } finally {
      this.saveInProgress = false
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
      const session = await this.sessionManager.getCurrentSession()
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
    const session = await this.sessionManager.getCurrentSession()
    console.log("Preparing save dialog data. Active session:", session)
    const isOverwriteAvailable = Boolean(session?.activePromptId)

    let initialName: string | undefined
    if (session?.activePromptId) {
      const activePrompt = await this.storage.getPrompt(session.activePromptId)
      initialName = activePrompt?.name
    } else {
      initialName = this.generatePromptName(content)
    }

    return {
      initialContent: content,
      isOverwriteAvailable,
      initialName,
    }
  }

  /**
   * Calculate composite score based on execution count and recency
   */
  private calculateCompositeScore(prompt: Prompt): number {
    const executionWeight = 1.0
    const recencyWeight = 0.5

    // Calculate days since last execution
    const now = new Date()
    const lastExecutedAt = new Date(prompt.lastExecutedAt)
    const daysDiff = Math.floor(
      (now.getTime() - lastExecutedAt.getTime()) / (1000 * 60 * 60 * 24),
    )

    // Calculate recency score (0-100, higher is more recent)
    const recencyScore = Math.max(0, 100 - daysDiff)

    // Calculate composite score
    const score =
      prompt.executionCount * executionWeight + recencyScore * recencyWeight

    return score
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
