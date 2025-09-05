import { promptStorage, StorageService } from "../storage"
import { ChatGptService } from "../chatgpt/chatGptService"
import type {
  AIServiceInterface,
  Prompt,
  Session,
  SaveDialogData,
  NotificationData,
  PromptError,
} from "../../types/prompt"
import { SessionManager } from "./sessionManager"
import { StorageHelper } from "./storageHelper"
import { ExecuteManager } from "./executeManager"

/**
 * プロンプト履歴管理のメインオーケストレーター
 */
export class HistoryManager {
  private static instance: HistoryManager
  private aiService: AIServiceInterface | null = null
  private storage: StorageService
  private sessionManager: SessionManager
  private storageHelper: StorageHelper
  private executeManager: ExecuteManager
  private initialized = false

  // コールバック
  private onSessionChangeCallbacks: ((session: Session | null) => void)[] = []
  private onPromptSaveCallbacks: ((prompt: Prompt) => void)[] = []
  private onNotificationCallbacks: ((
    notification: NotificationData,
  ) => void)[] = []
  private onErrorCallbacks: ((error: PromptError) => void)[] = []

  private constructor() {
    this.storage = promptStorage
    this.sessionManager = new SessionManager(this.storage)
    this.storageHelper = new StorageHelper(this.storage, this.sessionManager)
    this.executeManager = new ExecuteManager(this.storage, this.sessionManager)
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager()
    }
    return HistoryManager.instance
  }

  /**
   * プロンプト履歴マネージャーの初期化
   */
  async initialize(): Promise<void> {
    try {
      // ストレージサービス初期化
      await this.storage.initialize()

      // AIサービス初期化（サポートされている場合のみ）
      await this.initializeAIService()

      // イベントリスナー設定
      this.setupEventListeners()

      // セッション復元
      await this.sessionManager.restoreSession()

      this.initialized = true
      this.notify({ type: "info", message: "Prompt History initialized" })
    } catch (error) {
      this.handleError(
        "INIT_FAILED",
        "Failed to initialize prompt history manager",
        error,
      )
      throw error
    }
  }

  /**
   * AIサービス初期化
   */
  private async initializeAIService(): Promise<void> {
    const service = new ChatGptService()

    if (service.isSupported()) {
      try {
        await service.initialize()
        this.aiService = service
        console.log("ChatGPT service initialized")
      } catch (error) {
        console.warn("Failed to initialize ChatGPT service:", error)
      }
    }
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    if (this.aiService) {
      // 送信イベント監視（自動保存）
      this.aiService.onSend(this.handleAutoSave.bind(this))

      // ページ遷移イベント監視
      window.addEventListener(
        "beforeunload",
        this.sessionManager.handlePageUnload.bind(this.sessionManager),
      )
      window.addEventListener(
        "popstate",
        this.sessionManager.handlePageChange.bind(this.sessionManager),
      )
    }
  }

  // ===================
  // セッション管理
  // ===================

  /**
   * セッション開始
   */
  async startSession(promptId: string): Promise<void> {
    this.ensureInitialized()

    try {
      const session = await this.sessionManager.startSession(promptId)
      this.notifySessionChange(session)
      console.debug("Session started for prompt:", promptId)
    } catch (error) {
      this.handleError("SESSION_START_FAILED", "Failed to start session", error)
    }
  }

  /**
   * セッション終了
   */
  async endSession(): Promise<void> {
    this.ensureInitialized()

    try {
      await this.sessionManager.endSession()
      this.notifySessionChange(null)
      console.debug("Session ended")
    } catch (error) {
      this.handleError("SESSION_END_FAILED", "Failed to end session", error)
    }
  }

  /**
   * 現在のセッション取得
   */
  getCurrentSession(): Session | null {
    this.ensureInitialized()
    return this.sessionManager.getCurrentSession()
  }

  /**
   * アクティブセッション判定
   */
  hasActiveSession(): boolean {
    this.ensureInitialized()
    return this.sessionManager.hasActiveSession()
  }

  // ===================
  // プロンプト保存系
  // ===================

  /**
   * 手動プロンプト保存
   */
  async savePromptManually(saveData: SaveDialogData): Promise<Prompt | null> {
    this.ensureInitialized()

    return this.storageHelper.savePromptManually(
      saveData,
      (prompt) => {
        this.notifyPromptSave(prompt)
        this.notify({
          type: "success",
          message: `Prompt "${prompt.name}" saved successfully`,
          duration: 3000,
        })
      },
      (error) => {
        this.handleError(
          "MANUAL_SAVE_FAILED",
          "Failed to save prompt manually",
          error,
        )
      },
    )
  }

  /**
   * 自動プロンプト保存（送信時）
   */
  private async handleAutoSave(): Promise<void> {
    if (!this.aiService) return
    await this.storageHelper.handleAutoSave(
      this.aiService,
      (prompt) => {
        this.notifyPromptSave(prompt)
      },
      (error) => {
        console.warn("Auto-save failed:", error)
      },
    )
  }

  /**
   * プロンプト削除
   */
  async deletePrompt(promptId: string): Promise<void> {
    this.ensureInitialized()

    await this.storageHelper.deletePrompt(
      promptId,
      (prompt) => {
        this.notify({
          type: "success",
          message: `Prompt "${prompt.name}" deleted`,
          duration: 2000,
        })
      },
      (error) => {
        this.handleError("DELETE_FAILED", "Failed to delete prompt", error)
      },
    )
  }

  /**
   * プロンプトをピン留め
   */
  async pinPrompt(promptId: string): Promise<void> {
    this.ensureInitialized()
    await this.storageHelper.pinPrompt(promptId)
  }

  /**
   * プロンプトのピン留め解除
   */
  async unpinPrompt(promptId: string): Promise<void> {
    this.ensureInitialized()
    await this.storageHelper.unpinPrompt(promptId)
  }

  // ===================
  // プロンプト実行・UI系
  // ===================

  /**
   * プロンプト実行
   */
  async executePrompt(promptId: string): Promise<void> {
    this.ensureInitialized()

    if (!this.aiService) {
      this.handleError("EXECUTE_FAILED", "AI service not available", null)
      return
    }

    await this.executeManager.executePrompt(
      promptId,
      this.aiService,
      (prompt) => {
        this.notify({
          type: "success",
          message: `Prompt "${prompt.name}" executed`,
          duration: 2000,
        })
      },
      (error) => {
        this.handleError("EXECUTE_FAILED", "Failed to execute prompt", error)
      },
    )
  }

  /**
   * 保存ダイアログ用データ準備
   */
  prepareSaveDialogData(): {
    initialContent: string
    isOverwriteAvailable: boolean
    initialName?: string
  } {
    this.ensureInitialized()
    return this.storageHelper.prepareSaveDialogData(this.aiService)
  }

  /**
   * プロンプト一覧取得（ソート済み）
   */
  getPrompts(): Prompt[] {
    this.ensureInitialized()
    return this.executeManager.getPrompts()
  }

  /**
   * ピン留めプロンプト取得（順序保持）
   */
  getPinnedPrompts(): Prompt[] {
    this.ensureInitialized()
    return this.executeManager.getPinnedPrompts()
  }

  // ===================
  // コールバック管理
  // ===================

  /**
   * セッション変更通知の登録
   */
  onSessionChange(callback: (session: Session | null) => void): void {
    this.onSessionChangeCallbacks.push(callback)
  }

  /**
   * プロンプト保存通知の登録
   */
  onPromptSave(callback: (prompt: Prompt) => void): void {
    this.onPromptSaveCallbacks.push(callback)
  }

  /**
   * 通知の登録
   */
  onNotification(callback: (notification: NotificationData) => void): void {
    this.onNotificationCallbacks.push(callback)
  }

  /**
   * エラー通知の登録
   */
  onError(callback: (error: PromptError) => void): void {
    this.onErrorCallbacks.push(callback)
  }

  // ===================
  // プライベートメソッド
  // ===================

  /**
   * 初期化チェック
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        "PromptHistoryManager not initialized. Call initialize() first.",
      )
    }
  }

  /**
   * セッション変更通知
   */
  private notifySessionChange(session: Session | null): void {
    this.onSessionChangeCallbacks.forEach((callback) => {
      try {
        callback(session)
      } catch (error) {
        console.error("Session change callback error:", error)
      }
    })
  }

  /**
   * プロンプト保存通知
   */
  private notifyPromptSave(prompt: Prompt): void {
    this.onPromptSaveCallbacks.forEach((callback) => {
      try {
        callback(prompt)
      } catch (error) {
        console.error("Prompt save callback error:", error)
      }
    })
  }

  /**
   * 通知
   */
  private notify(notification: NotificationData): void {
    this.onNotificationCallbacks.forEach((callback) => {
      try {
        callback(notification)
      } catch (error) {
        console.error("Notification callback error:", error)
      }
    })
  }

  /**
   * エラーハンドリング
   */
  private handleError(code: string, message: string, details: any): void {
    const error: PromptError = { code, message, details }

    this.onErrorCallbacks.forEach((callback) => {
      try {
        callback(error)
      } catch (err) {
        console.error("Error callback error:", err)
      }
    })

    // ユーザー通知
    this.notify({
      type: "error",
      message: message,
      duration: 5000,
    })

    console.error(`PromptHistoryManager Error [${code}]:`, message, details)
  }

  /**
   * サービス終了処理
   */
  destroy(): void {
    if (
      this.aiService &&
      typeof (this.aiService as any).destroy === "function"
    ) {
      ;(this.aiService as any).destroy()
    }

    window.removeEventListener(
      "beforeunload",
      this.sessionManager.handlePageUnload.bind(this.sessionManager),
    )
    window.removeEventListener(
      "popstate",
      this.sessionManager.handlePageChange.bind(this.sessionManager),
    )

    this.onSessionChangeCallbacks = []
    this.onPromptSaveCallbacks = []
    this.onNotificationCallbacks = []
    this.onErrorCallbacks = []

    this.aiService = null
    this.initialized = false
  }
}
