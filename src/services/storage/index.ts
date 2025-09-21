import type {
  Prompt,
  Session,
  AppSettings,
  PromptStats,
  PromptError,
} from "../../types/prompt"
import { promptsService } from "./prompts"
import { sessionsService } from "./sessions"
import { pinsService } from "./pins"
import { settingsService } from "./settings"

/**
 * Integrated storage service (Facade pattern)
 */
export class StorageService {
  private static instance: StorageService

  private constructor() { }

  /**
   * Get singleton instance
   */
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  // ===================
  // Prompt operations
  // ===================

  /**
   * Save prompt
   */
  async savePrompt(
    prompt: Omit<Prompt, "id" | "createdAt" | "updatedAt">,
  ): Promise<Prompt> {
    return await promptsService.savePrompt(prompt)
  }

  /**
   * Update prompt
   */
  async updatePrompt(
    id: string,
    updates: Partial<Omit<Prompt, "id" | "createdAt">>,
  ): Promise<Prompt> {
    return await promptsService.updatePrompt(id, updates)
  }

  /**
   * Delete prompt
   */
  async deletePrompt(id: string): Promise<void> {
    await promptsService.deletePrompt(id)
    // Also remove from pinned order
    await pinsService.cleanupPinnedOrder(id)
  }

  /**
   * Get prompt
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    return await promptsService.getPrompt(id)
  }

  /**
   * Get all prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    return await promptsService.getAllPrompts()
  }

  /**
   * Increment prompt execution count
   */
  async incrementExecutionCount(id: string, url: string): Promise<void> {
    return await promptsService.incrementExecutionCount(id, url)
  }

  /**
   * Watch prompts for changes
   * @param callback Callback function to receive updated prompts
   * @returns Unsubscribe function
   */
  watchPrompts(callback: (prompts: Prompt[]) => void): () => void {
    return promptsService.watchPrompts(callback)
  }

  // ===================
  // Session operations
  // ===================

  /**
   * Start session
   */
  async startSession(promptId: string): Promise<void> {
    return await sessionsService.startSession(promptId)
  }

  /**
   * End session
   */
  async endSession(): Promise<void> {
    return await sessionsService.endSession()
  }

  /**
   * Get current session (async version)
   */
  getCurrentSession(): Promise<Session | null> {
    return sessionsService.getCurrentSession()
  }

  /**
   * Determine active session
   */
  hasActiveSession(): boolean {
    // Implementation for calling async methods synchronously needs adjustment as needed
    return false
  }

  /**
   * Determine active session (async version)
   */
  async hasActiveSessionAsync(): Promise<boolean> {
    return await sessionsService.hasActiveSession()
  }

  // ===================
  // Pin operations
  // ===================

  /**
   * Pin prompt
   */
  async pinPrompt(id: string): Promise<void> {
    return await pinsService.pinPrompt(id)
  }

  /**
   * Unpin prompt
   */
  async unpinPrompt(id: string): Promise<void> {
    return await pinsService.unpinPrompt(id)
  }

  /**
   * Get pinned order
   */
  async getPinnedOrder(): Promise<string[]> {
    return await pinsService.getPinnedOrder()
  }

  /**
   * Update pinned order
   */
  async updatePinnedOrder(order: string[]): Promise<void> {
    return await pinsService.updatePinnedOrder(order)
  }

  /**
   * Watch pinned order for changes
   * @param callback Callback function to receive updated pinned order
   * @returns Unsubscribe function
   */
  watchPinnedOrder(callback: (order: string[]) => void): () => void {
    return pinsService.watchPinnedOrder(callback)
  }

  // ===================
  // Settings operations
  // ===================

  /**
   * Get settings (async version)
   */
  async getSettings(): Promise<AppSettings> {
    return await settingsService.getSettings()
  }

  /**
   * Update settings
   */
  async setSettings(settings: Partial<AppSettings>): Promise<void> {
    return await settingsService.setSettings(settings)
  }

  /**
   * Watch settings for changes
   * @param callback Callback function to receive updated settings
   * @returns Unsubscribe function
   */
  watchSettings(
    callback: (settings: AppSettings, oldSettings: AppSettings) => void,
  ): () => void {
    return settingsService.watchSettings(callback)
  }

  // ===================
  // Statistics and utilities
  // ===================

  /**
   * Get prompt statistics
   */
  getStats(): PromptStats {
    // Implementation for calling async methods synchronously needs adjustment as needed
    return {
      totalPrompts: 0,
      pinnedPrompts: 0,
      totalExecutions: 0,
    }
  }

  /**
   * Get prompt statistics (async version)
   */
  async getStatsAsync(): Promise<PromptStats> {
    const prompts = await promptsService.getAllPrompts()
    const pinnedPrompts = prompts.filter((p) => p.isPinned)
    const totalExecutions = prompts.reduce(
      (sum, p) => sum + p.executionCount,
      0,
    )

    const mostExecutedPrompt = prompts.reduce(
      (max, current) =>
        current.executionCount > (max?.executionCount || 0) ? current : max,
      undefined as Prompt | undefined,
    )

    const recentlyExecutedPrompt = prompts.reduce(
      (latest, current) =>
        !latest || current.lastExecutedAt > latest.lastExecutedAt
          ? current
          : latest,
      undefined as Prompt | undefined,
    )

    return {
      totalPrompts: prompts.length,
      pinnedPrompts: pinnedPrompts.length,
      totalExecutions,
      mostExecutedPrompt,
      recentlyExecutedPrompt,
    }
  }

  /**
   * Complete storage clear (for debugging)
   */
  async clearAllData(): Promise<void> {
    try {
      // Initialize each storage item
      await Promise.all([
        promptsService.clearPrompts(),
        sessionsService.clearSessions(),
        pinsService.clearPins(),
        settingsService.clearSettings(),
      ])
    } catch (error) {
      throw this.createError("CLEAR_FAILED", "Failed to clear all data", error)
    }
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
