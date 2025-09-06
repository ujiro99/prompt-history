import type { Session } from "../../types/prompt"
import type { StorageService } from "../storage"

/**
 * Class responsible for session lifecycle management
 */
export class SessionManager {
  constructor(private storage: StorageService) {}

  /**
   * Start session
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
   * End session
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
   * Restore session (after page reload, etc.)
   */
  async restoreSession(): Promise<void> {
    try {
      const session = this.storage.getCurrentSession()
      if (session && session.url !== window.location.href) {
        // End session if URL has changed
        await this.endSession()
      }
    } catch (error) {
      console.warn("Failed to restore session:", error)
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.storage.getCurrentSession()
  }

  /**
   * Determine active session
   */
  hasActiveSession(): boolean {
    return this.storage.hasActiveSession()
  }

  /**
   * Handle page unload
   */
  handlePageUnload(): void {
    // Clean up session state
    this.endSession().catch(console.error)
  }

  /**
   * Handle page change
   */
  handlePageChange(): void {
    // Attempt session restoration
    this.restoreSession().catch(console.error)
  }
}
