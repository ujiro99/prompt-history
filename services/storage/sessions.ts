import type { Session, PromptError } from "../../types/prompt"
import { sessionStorage } from "./definitions"

/**
 * Session management service
 */
export class SessionsService {
  /**
   * Start session
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
   * End session
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
   * Get current session
   */
  async getCurrentSession(): Promise<Session | null> {
    return await sessionStorage.getValue()
  }

  /**
   * Determine active session
   */
  async hasActiveSession(): Promise<boolean> {
    const session = await this.getCurrentSession()
    return (
      session?.activePromptId !== null &&
      session?.url === globalThis.window.location.href
    )
  }

  /**
   * Clear storage (for debugging)
   */
  async clearSessions(): Promise<void> {
    await sessionStorage.setValue(null)
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
 * Singleton instance of session service
 */
export const sessionsService = new SessionsService()
