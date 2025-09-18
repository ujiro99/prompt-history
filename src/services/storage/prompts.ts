import type { Prompt, StoredPrompt, PromptError } from "../../types/prompt"
import { promptsStorage, settingsStorage } from "./definitions"

/**
 * Prompt management service
 */
export class PromptsService {
  /**
   * Convert Prompt object to StoredPrompt for storage
   */
  private toStoredPrompt(prompt: Prompt): StoredPrompt {
    return {
      ...prompt,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
      lastExecutedAt: prompt.lastExecutedAt.toISOString(),
    }
  }

  /**
   * Convert StoredPrompt to Prompt object
   */
  private fromStoredPrompt(stored: StoredPrompt): Prompt {
    return {
      ...stored,
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
      lastExecutedAt: new Date(stored.lastExecutedAt),
    }
  }

  /**
   * Save prompt
   */
  async savePrompt(
    prompt: Omit<Prompt, "id" | "createdAt" | "updatedAt">,
  ): Promise<Prompt> {
    try {
      const now = new Date()
      const newPrompt: Prompt = {
        ...prompt,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now,
      }

      const currentPrompts = await promptsStorage.getValue()
      const storedPrompt = this.toStoredPrompt(newPrompt)
      const updatedPrompts = {
        ...currentPrompts,
        [newPrompt.id]: storedPrompt,
      }

      await promptsStorage.setValue(updatedPrompts)

      // Check maximum count
      await this.enforceMaxPrompts()

      return newPrompt
    } catch (error) {
      throw this.createError("SAVE_FAILED", "Failed to save prompt", error)
    }
  }

  /**
   * Update prompt
   */
  async updatePrompt(
    id: string,
    updates: Partial<Omit<Prompt, "id" | "createdAt">>,
  ): Promise<Prompt> {
    try {
      const currentPrompts = await promptsStorage.getValue()
      const existingPrompt = currentPrompts[id]

      if (!existingPrompt) {
        throw new Error(`Prompt with id ${id} not found`)
      }

      const updatedPrompt: Prompt = {
        ...this.fromStoredPrompt(existingPrompt),
        ...updates,
        updatedAt: new Date(),
      }

      const storedPrompt = this.toStoredPrompt(updatedPrompt)
      const updatedPrompts = {
        ...currentPrompts,
        [id]: storedPrompt,
      }

      await promptsStorage.setValue(updatedPrompts)
      return updatedPrompt
    } catch (error) {
      throw this.createError("UPDATE_FAILED", "Failed to update prompt", error)
    }
  }

  /**
   * Delete prompt
   */
  async deletePrompt(id: string): Promise<void> {
    try {
      const currentPrompts = await promptsStorage.getValue()

      if (!currentPrompts[id]) {
        throw new Error(`Prompt with id ${id} not found`)
      }

      const { [id]: _deleted, ...remainingPrompts } = currentPrompts
      await promptsStorage.setValue(remainingPrompts)
    } catch (error) {
      throw this.createError("DELETE_FAILED", "Failed to delete prompt", error)
    }
  }

  /**
   * Clear storage (for debugging)
   */
  async clearPrompts(): Promise<void> {
    await promptsStorage.setValue({})
  }

  /**
   * Get prompt
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    const storedPrompts = await promptsStorage.getValue()
    const storedPrompt = storedPrompts[id]
    return storedPrompt ? this.fromStoredPrompt(storedPrompt) : null
  }

  /**
   * Get all prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    const storedPrompts = await promptsStorage.getValue()
    return Object.values(storedPrompts).map((stored) =>
      this.fromStoredPrompt(stored),
    )
  }

  /**
   * Watch for changes in prompts
   * Returns an unsubscribe function
   */
  watchPrompts(callback: (prompts: Prompt[]) => void): () => void {
    return promptsStorage.watch((newValue) => {
      const prompts = Object.values(newValue).map((stored) =>
        this.fromStoredPrompt(stored),
      )
      callback(prompts)
    })
  }

  /**
   * Increment prompt execution count
   */
  async incrementExecutionCount(id: string, url: string): Promise<void> {
    try {
      const prompt = await this.getPrompt(id)
      if (!prompt) {
        throw new Error(`Prompt with id ${id} not found`)
      }

      await this.updatePrompt(id, {
        executionCount: prompt.executionCount + 1,
        lastExecutedAt: new Date(),
        lastExecutionUrl: url,
      })
    } catch (error) {
      throw this.createError(
        "INCREMENT_FAILED",
        "Failed to increment execution count",
        error,
      )
    }
  }

  /**
   * Apply maximum prompt count limit
   */
  private async enforceMaxPrompts(): Promise<void> {
    const settings = await settingsStorage.getValue()
    const prompts = await this.getAllPrompts()

    if (prompts.length > settings.maxPrompts) {
      // Delete old unpinned prompts first
      const unpinnedPrompts = prompts
        .filter((p) => !p.isPinned)
        .sort((a, b) => a.lastExecutedAt.getTime() - b.lastExecutedAt.getTime())

      const deleteCount = prompts.length - settings.maxPrompts
      const toDelete = unpinnedPrompts.slice(0, deleteCount)

      for (const prompt of toDelete) {
        await this.deletePrompt(prompt.id)
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    // Use native crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return "prompt_" + crypto.randomUUID()
    }
    // Fallback for older browsers or environments without crypto.randomUUID()
    return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Create error object
   */
  private createError(
    code: string,
    message: string,
    details?: unknown,
  ): PromptError {
    return {
      code,
      message,
      details,
    }
  }
}

/**
 * Singleton instance of prompt service
 */
export const promptsService = new PromptsService()
