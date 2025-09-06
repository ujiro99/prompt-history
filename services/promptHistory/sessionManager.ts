import type { Session } from "../../types/prompt"
import type { StorageService } from "../storage"

/**
 * セッションの生命周期管理を担当するクラス
 */
export class SessionManager {
  constructor(private storage: StorageService) {}

  /**
   * セッション開始
   */
  async startSession(promptId: string): Promise<Session | null> {
    console.debug("Starting session with promptId:", promptId)
    try {
      await this.storage.startSession(promptId)
      return this.storage.getCurrentSession()
    } catch (error) {
      console.error("Failed to start session:", error)
      return null
    }
  }

  /**
   * セッション終了
   */
  async endSession(): Promise<void> {
    console.debug("Ending current session")
    try {
      await this.storage.endSession()
    } catch (error) {
      console.error("Failed to end session:", error)
    }
  }

  /**
   * セッション復元（ページリロード後など）
   */
  async restoreSession(): Promise<void> {
    try {
      const session = this.storage.getCurrentSession()
      if (session && session.url !== window.location.href) {
        // URLが変わっている場合はセッション終了
        await this.endSession()
      }
    } catch (error) {
      console.warn("Failed to restore session:", error)
    }
  }

  /**
   * 現在のセッション取得
   */
  getCurrentSession(): Session | null {
    return this.storage.getCurrentSession()
  }

  /**
   * アクティブセッション判定
   */
  hasActiveSession(): boolean {
    return this.storage.hasActiveSession()
  }

  /**
   * ページアンロード処理
   */
  handlePageUnload(): void {
    // セッション状態をクリーンアップ
    this.endSession().catch(console.error)
  }

  /**
   * ページ変更処理
   */
  handlePageChange(): void {
    // セッション復元を試行
    this.restoreSession().catch(console.error)
  }
}
