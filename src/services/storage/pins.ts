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
   * Pin multiple prompts in bulk (for import operations)
   */
  async pinBulkPrompts(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return
    }

    try {
      // Get current pinned order once
      const currentOrder = await pinnedOrderStorage.getValue()
      const currentOrderSet = new Set(currentOrder)

      // Filter out IDs that are already pinned to avoid duplicates
      const newIds = ids.filter((id) => !currentOrderSet.has(id))

      if (newIds.length > 0) {
        // Single storage write for all new pins
        await pinnedOrderStorage.setValue([...currentOrder, ...newIds])
      }
    } catch (error) {
      throw this.createError("BULK_PIN_FAILED", "Failed to pin prompts in bulk", error)
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
   * Watch pinned order changes
   * Returns an unsubscribe function
   */
  watchPinnedOrder(callback: (pinned: string[]) => void): () => void {
    return pinnedOrderStorage.watch(callback)
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
