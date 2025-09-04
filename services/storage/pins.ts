import type { PromptError } from "../../types/prompt"
import { pinnedOrderStorage } from "./definitions"
import { promptsService } from "./prompts"

/**
 * ピン留め管理サービス
 */
export class PinsService {
  /**
   * プロンプトをピン留め
   */
  async pinPrompt(id: string): Promise<void> {
    try {
      // プロンプト存在チェック
      const prompt = await promptsService.getPrompt(id)
      if (!prompt) {
        throw new Error(`Prompt with id ${id} not found`)
      }

      // プロンプトのピン留めフラグ更新
      await promptsService.updatePrompt(id, { isPinned: true })

      // ピン留め順序に追加（重複チェック）
      const currentOrder = await pinnedOrderStorage.getValue()
      if (!currentOrder.includes(id)) {
        await pinnedOrderStorage.setValue([...currentOrder, id])
      }
    } catch (error) {
      throw this.createError("PIN_FAILED", "Failed to pin prompt", error)
    }
  }

  /**
   * プロンプトのピン留め解除
   */
  async unpinPrompt(id: string): Promise<void> {
    try {
      // プロンプトのピン留めフラグ更新
      await promptsService.updatePrompt(id, { isPinned: false })

      // ピン留め順序から削除
      const currentOrder = await pinnedOrderStorage.getValue()
      const newOrder = currentOrder.filter((pinnedId) => pinnedId !== id)
      await pinnedOrderStorage.setValue(newOrder)
    } catch (error) {
      throw this.createError("UNPIN_FAILED", "Failed to unpin prompt", error)
    }
  }

  /**
   * ピン留め順序を取得
   */
  async getPinnedOrder(): Promise<string[]> {
    return await pinnedOrderStorage.getValue()
  }

  /**
   * ピン留め順序を更新
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
   * プロンプト削除時のピン留め順序クリーンアップ
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
   * ストレージをクリア（デバッグ用）
   */
  async clearPins(): Promise<void> {
    await pinnedOrderStorage.setValue([])
  }

  /**
   * エラーオブジェクトの生成
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
 * ピン留めサービスのシングルトンインスタンス
 */
export const pinsService = new PinsService()
