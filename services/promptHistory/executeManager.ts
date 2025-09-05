import type { Prompt, AIServiceInterface } from "../../types/prompt"
import type { StorageService } from "../storage"
import { SessionManager } from "./sessionManager"

/**
 * プロンプトの実行・UI支援処理を担当するクラス（Storage読み込み系）
 */
export class ExecuteManager {
  constructor(
    private storage: StorageService,
    private sessionManager: SessionManager,
  ) {}

  /**
   * プロンプト実行
   */
  async executePrompt(
    promptId: string,
    aiService: AIServiceInterface,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const prompt = this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      // AIサービスにプロンプトを挿入
      aiService.injectPromptContent(prompt.content)

      // セッション開始
      await this.sessionManager.startSession(promptId)

      // 実行回数インクリメント
      await this.storage.incrementExecutionCount(promptId, window.location.href)

      onSuccess?.(prompt)
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Execute failed")
      onError?.(err)
    }
  }

  /**
   * プロンプト一覧取得（ソート済み）
   */
  getPrompts(): Prompt[] {
    const prompts = this.storage.getAllPrompts()
    const settings = this.storage.getSettings()

    // ソート処理
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
   * ピン留めプロンプト取得（順序保持）
   */
  getPinnedPrompts(): Prompt[] {
    const pinnedOrder = this.storage.getPinnedOrder()
    const prompts = this.storage.getAllPrompts()

    return pinnedOrder
      .map((id) => prompts.find((p) => p.id === id))
      .filter((p): p is Prompt => Boolean(p))
  }

  /**
   * プロンプト取得
   */
  getPrompt(promptId: string): Prompt | null {
    return this.storage.getPrompt(promptId)
  }

  /**
   * 設定取得
   */
  getSettings() {
    return this.storage.getSettings()
  }
}
