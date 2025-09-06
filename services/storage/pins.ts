import type { PromptError } from "../../types/prompt"
import { pinnedOrderStorage } from "./definitions"
import { promptsService } from "./prompts"

/**
 * Pin management service
 */
export class PinsService {
  /**
   * Pin prompt
   */
  async pinPrompt(id: string): Promise<void> {
    try {
      // Check prompt existence
      const prompt = await promptsService.getPrompt(id)
      if (!prompt) {
        throw new Error(`Prompt with id ${id} not found`)
      }

      // Update prompt pin flag
      await promptsService.updatePrompt(id, { isPinned: true })

      // Add to pinned order (duplicate check)
      const currentOrder = await pinnedOrderStorage.getValue()
      if (!currentOrder.includes(id)) {
        await pinnedOrderStorage.setValue([...currentOrder, id])
      }
    } catch (error) {
      throw this.createError("PIN_FAILED", "Failed to pin prompt", error)
    }
  }

  /**
   * Unpin prompt
   */
  async unpinPrompt(id: string): Promise<void> {
    try {
      // Update prompt pin flag
      await promptsService.updatePrompt(id, { isPinned: false })

      // Remove from pinned order
      const currentOrder = await pinnedOrderStorage.getValue()
      const newOrder = currentOrder.filter((pinnedId) => pinnedId !== id)
      await pinnedOrderStorage.setValue(newOrder)
    } catch (error) {
      throw this.createError("UNPIN_FAILED", "Failed to unpin prompt", error)
    }
  }

  /**
   * Get pinned order
   */
  async getPinnedOrder(): Promise<string[]> {
    return await pinnedOrderStorage.getValue()
  }

  /**
   * Update pinned order
   */
  async updatePinnedOrder(order: string[]): Promise<void> {
    try {
      await pinnedOrderStorage.setValue(order)
    } catch (error) {
      throw this.createError(
        "PIN_ORDER_FAILED",
        "Failed to update pinned order",
        error,
      )
    }
  }

  /**
   * Cleanup pinned order when prompt is deleted
   */
  async cleanupPinnedOrder(deletedPromptId: string): Promise<void> {
    try {
      const currentOrder = await pinnedOrderStorage.getValue()
      const newOrder = currentOrder.filter((id) => id !== deletedPromptId)
      await pinnedOrderStorage.setValue(newOrder)
    } catch (error) {
      throw this.createError(
        "PIN_CLEANUP_FAILED",
        "Failed to cleanup pinned order",
        error,
      )
    }
  }

  /**
   * Clear storage (for debugging)
   */
  async clearPins(): Promise<void> {
    await pinnedOrderStorage.setValue([])
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
 * Singleton instance of pin service
 */
export const pinsService = new PinsService()
