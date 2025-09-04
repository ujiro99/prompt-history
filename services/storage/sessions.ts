import type { Session, PromptError } from "../../types/prompt"
import { sessionStorage } from "./definitions"

/**
 * セッション管理サービス
 */
export class SessionsService {
  /**
   * セッション開始
   */
  async startSession(promptId: string): Promise<void> {
    try {
      const session: Session = {
        activePromptId: promptId,
        url: globalThis.window.location.href,
        startedAt: new Date(),
      }

      await sessionStorage.setValue(session)
    } catch (error) {
      throw this.createError(
        "SESSION_START_FAILED",
        "Failed to start session",
        error,
      )
    }
  }

  /**
   * セッション終了
   */
  async endSession(): Promise<void> {
    try {
      await sessionStorage.setValue(null)
    } catch (error) {
      throw this.createError(
        "SESSION_END_FAILED",
        "Failed to end session",
        error,
      )
    }
  }

  /**
   * 現在のセッション取得
   */
  async getCurrentSession(): Promise<Session | null> {
    return await sessionStorage.getValue()
  }

  /**
   * アクティブセッション判定
   */
  async hasActiveSession(): Promise<boolean> {
    const session = await this.getCurrentSession()
    return (
      session?.activePromptId !== null &&
      session?.url === globalThis.window.location.href
    )
  }

  /**
   * ストレージをクリア（デバッグ用）
   */
  async clearSessions(): Promise<void> {
    await sessionStorage.setValue(null)
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
 * セッションサービスのシングルトンインスタンス
 */
export const sessionsService = new SessionsService()
