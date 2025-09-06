import type { Prompt, StoredPrompt, PromptError } from "../../types/prompt"
import { promptsStorage, settingsStorage } from "./definitions"

/**
 * プロンプト管理サービス
 */
export class PromptsService {
  /**
   * Promptオブジェクトをストレージ用のStoredPromptに変換
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
   * ストレージ用のStoredPromptをPromptオブジェクトに変換
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
   * プロンプトを保存
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

      // 最大数チェック
      await this.enforceMaxPrompts()

      return newPrompt
    } catch (error) {
      throw this.createError("SAVE_FAILED", "Failed to save prompt", error)
    }
  }

  /**
   * プロンプトを更新
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
   * プロンプトを削除
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
   * ストレージをクリア（デバッグ用）
   */
  async clearPrompts(): Promise<void> {
    await promptsStorage.setValue({})
  }

  /**
   * プロンプトを取得
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    const storedPrompts = await promptsStorage.getValue()
    const storedPrompt = storedPrompts[id]
    return storedPrompt ? this.fromStoredPrompt(storedPrompt) : null
  }

  /**
   * 全プロンプトを取得
   */
  async getAllPrompts(): Promise<Prompt[]> {
    const storedPrompts = await promptsStorage.getValue()
    return Object.values(storedPrompts).map((stored) =>
      this.fromStoredPrompt(stored),
    )
  }

  /**
   * プロンプトの実行回数を増加
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
   * 最大プロンプト数制限の適用
   */
  private async enforceMaxPrompts(): Promise<void> {
    const settings = await settingsStorage.getValue()
    const prompts = await this.getAllPrompts()

    if (prompts.length > settings.maxPrompts) {
      // ピン留めされていない古いプロンプトから削除
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
   * ユニークIDの生成
   */
  private generateId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
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
 * プロンプトサービスのシングルトンインスタンス
 */
export const promptsService = new PromptsService()
