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
 * 統合ストレージサービス（ファサードパターン）
 * 既存のPromptStorageServiceとの後方互換性を維持
 */
export class PromptStorageService {
  private static instance: PromptStorageService

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): PromptStorageService {
    if (!PromptStorageService.instance) {
      PromptStorageService.instance = new PromptStorageService()
    }
    return PromptStorageService.instance
  }

  /**
   * ストレージサービスの初期化
   * WXT Storageは自動的に初期化されるため、このメソッドは互換性のためのダミー
   */
  async initialize(): Promise<void> {
    // WXT Storageは自動初期化されるため何もしない
    // 既存コードとの互換性を保つためのメソッド
  }

  // ===================
  // プロンプト操作
  // ===================

  /**
   * プロンプトを保存
   */
  async savePrompt(
    prompt: Omit<Prompt, "id" | "createdAt" | "updatedAt">,
  ): Promise<Prompt> {
    return await promptsService.savePrompt(prompt)
  }

  /**
   * プロンプトを更新
   */
  async updatePrompt(
    id: string,
    updates: Partial<Omit<Prompt, "id" | "createdAt">>,
  ): Promise<Prompt> {
    return await promptsService.updatePrompt(id, updates)
  }

  /**
   * プロンプトを削除
   */
  async deletePrompt(id: string): Promise<void> {
    await promptsService.deletePrompt(id)
    // ピン留め順序からも削除
    await pinsService.cleanupPinnedOrder(id)
  }

  /**
   * プロンプトを取得
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPrompt(_id: string): Prompt | null {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    // 現在は互換性のため一時的にnullを返す
    return null
  }

  /**
   * プロンプトを取得（非同期版）
   */
  async getPromptAsync(id: string): Promise<Prompt | null> {
    return await promptsService.getPrompt(id)
  }

  /**
   * 全プロンプトを取得
   */
  getAllPrompts(): Prompt[] {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    // 現在は互換性のため空配列を返す
    return []
  }

  /**
   * 全プロンプトを取得（非同期版）
   */
  async getAllPromptsAsync(): Promise<Prompt[]> {
    return await promptsService.getAllPrompts()
  }

  /**
   * プロンプトの実行回数を増加
   */
  async incrementExecutionCount(id: string, url: string): Promise<void> {
    return await promptsService.incrementExecutionCount(id, url)
  }

  // ===================
  // セッション操作
  // ===================

  /**
   * セッション開始
   */
  async startSession(promptId: string): Promise<void> {
    return await sessionsService.startSession(promptId)
  }

  /**
   * セッション終了
   */
  async endSession(): Promise<void> {
    return await sessionsService.endSession()
  }

  /**
   * 現在のセッション取得
   */
  getCurrentSession(): Session | null {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    return null
  }

  /**
   * 現在のセッション取得（非同期版）
   */
  async getCurrentSessionAsync(): Promise<Session | null> {
    return await sessionsService.getCurrentSession()
  }

  /**
   * アクティブセッション判定
   */
  hasActiveSession(): boolean {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    return false
  }

  /**
   * アクティブセッション判定（非同期版）
   */
  async hasActiveSessionAsync(): Promise<boolean> {
    return await sessionsService.hasActiveSession()
  }

  // ===================
  // ピン留め操作
  // ===================

  /**
   * プロンプトをピン留め
   */
  async pinPrompt(id: string): Promise<void> {
    return await pinsService.pinPrompt(id)
  }

  /**
   * プロンプトのピン留め解除
   */
  async unpinPrompt(id: string): Promise<void> {
    return await pinsService.unpinPrompt(id)
  }

  /**
   * ピン留め順序を取得
   */
  getPinnedOrder(): string[] {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    return []
  }

  /**
   * ピン留め順序を取得（非同期版）
   */
  async getPinnedOrderAsync(): Promise<string[]> {
    return await pinsService.getPinnedOrder()
  }

  /**
   * ピン留め順序を更新
   */
  async updatePinnedOrder(order: string[]): Promise<void> {
    return await pinsService.updatePinnedOrder(order)
  }

  // ===================
  // 設定操作
  // ===================

  /**
   * 設定を取得
   */
  getSettings(): AppSettings {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    // 現在は互換性のためデフォルト設定を返す
    return {
      autoSaveEnabled: true,
      maxPrompts: 1000,
      defaultSortOrder: "recent",
      showNotifications: true,
    }
  }

  /**
   * 設定を取得（非同期版）
   */
  async getSettingsAsync(): Promise<AppSettings> {
    return await settingsService.getSettings()
  }

  /**
   * 設定を更新
   */
  async setSettings(settings: Partial<AppSettings>): Promise<void> {
    return await settingsService.setSettings(settings)
  }

  // ===================
  // 統計・ユーティリティ
  // ===================

  /**
   * プロンプト統計を取得
   */
  getStats(): PromptStats {
    // 非同期メソッドを同期的に呼び出すための実装は必要に応じて調整
    return {
      totalPrompts: 0,
      pinnedPrompts: 0,
      totalExecutions: 0,
    }
  }

  /**
   * プロンプト統計を取得（非同期版）
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
   * ストレージの完全クリア（デバッグ用）
   */
  async clearAllData(): Promise<void> {
    try {
      // 各ストレージアイテムを初期化
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
 * ストレージサービスのシングルトンインスタンス
 */
export const promptStorage = PromptStorageService.getInstance()

// 個別サービスもエクスポート
export { promptsService, sessionsService, pinsService, settingsService }
