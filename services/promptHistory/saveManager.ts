import type {
  Prompt,
  SaveDialogData,
  AIServiceInterface,
} from "../../types/prompt"
import type { PromptStorageService } from "../storage"
import { SessionManager } from "./sessionManager"

/**
 * プロンプトの保存・削除系処理を担当するクラス（Storage書き込み系）
 */
export class saveManager {
  private saveInProgress = false

  constructor(
    private storage: PromptStorageService,
    private sessionManager: SessionManager,
  ) {}

  /**
   * 手動プロンプト保存
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
          isPinned: true, // 手動保存は自動ピン留め
        })
      } else {
        savedPrompt = await this.storage.savePrompt({
          name: saveData.name,
          content: saveData.content,
          executionCount: 0,
          lastExecutedAt: new Date(),
          isPinned: true, // 手動保存は自動ピン留め
          lastExecutionUrl: window.location.href,
        })
      }

      // ピン留め処理
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
   * 自動プロンプト保存（送信時）
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

      // 新規プロンプトとして保存（セッション状態無関係）
      const savedPrompt = await this.storage.savePrompt({
        name: this.generatePromptName(content),
        content,
        executionCount: 1,
        lastExecutedAt: new Date(),
        isPinned: false,
        lastExecutionUrl: window.location.href,
      })

      // セッションがある場合は元プロンプトの実行回数もインクリメント
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
   * プロンプト削除
   */
  async deletePrompt(
    promptId: string,
    onSuccess?: (prompt: Prompt) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const prompt = this.storage.getPrompt(promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`)
      }

      // アクティブセッションの場合は終了
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
   * プロンプトをピン留め
   */
  async pinPrompt(promptId: string): Promise<void> {
    await this.storage.pinPrompt(promptId)
  }

  /**
   * プロンプトのピン留め解除
   */
  async unpinPrompt(promptId: string): Promise<void> {
    await this.storage.unpinPrompt(promptId)
  }

  /**
   * 保存ダイアログ用データ準備
   */
  prepareSaveDialogData(aiService: AIServiceInterface | null): {
    initialContent: string
    isOverwriteAvailable: boolean
    initialName?: string
  } {
    const content = aiService?.extractPromptContent()?.trim() || ""
    const session = this.sessionManager.getCurrentSession()
    const isOverwriteAvailable = Boolean(session?.activePromptId)

    let initialName: string | undefined
    if (session?.activePromptId) {
      const activePrompt = this.storage.getPrompt(session.activePromptId)
      initialName = activePrompt?.name
    }

    return {
      initialContent: content,
      isOverwriteAvailable,
      initialName,
    }
  }

  /**
   * プロンプト名自動生成
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
