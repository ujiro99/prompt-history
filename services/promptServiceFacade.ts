import { promptStorage, StorageService } from "./storage"
import type {
  AIServiceInterface,
  Prompt,
  Session,
  SaveDialogData,
  NotificationData,
  PromptError,
} from "../types/prompt"
import { SessionManager } from "./promptHistory/sessionManager"
import { StorageHelper } from "./promptHistory/storageHelper"
import { ExecuteManager } from "./promptHistory/executeManager"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"

/**
 * Main orchestrator for prompt history management
 */
export class PromptServiceFacade {
  private static instance: PromptServiceFacade
  private aiService: AIServiceInterface | null = null
  private storage: StorageService
  private sessionManager: SessionManager
  private storageHelper: StorageHelper
  private executeManager: ExecuteManager
  private initialized = false

  // Callbacks
  private onSessionChangeCallbacks: ((session: Session | null) => void)[] = []
  private onPromptChangeCallbacks: ((prompt: Prompt) => void)[] = []
  private onPinChangeCallbacks: (() => void)[] = []
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
   * Get singleton instance
   */
  static getInstance(): PromptServiceFacade {
    if (!PromptServiceFacade.instance) {
      PromptServiceFacade.instance = new PromptServiceFacade()
    }
    return PromptServiceFacade.instance
  }

  /**
   * Initialize prompt history manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize storage service
      await this.storage.initialize()

      // Initialize AI service (only if supported)
      await this.initializeAIService()

      // Set up event listeners
      this.setupEventListeners()

      // Restore session
      await this.sessionManager.restoreSession()

      this.initialized = true
      this.notify({
        type: "info",
        message: "Prompt History initialized",
        duration: 2000,
      })
    } catch (error) {
      this.handleError(
        "INIT_FAILED",
        "Failed to initialize prompt service facade",
        error,
      )
      throw error
    }
  }

  /**
   * Initialize AI service
   */
  private async initializeAIService(): Promise<void> {
    // Import both services dynamically to avoid loading unnecessary code
    const { ChatGptService } = await import("./chatgpt/chatGptService")
    const { GeminiService } = await import("./gemini/geminiService")

    // Try each service in order
    const services = [new ChatGptService(), new GeminiService()]

    for (const service of services) {
      if (service.isSupported()) {
        try {
          await service.initialize()
          this.aiService = service
          return
        } catch (error) {
          console.warn(
            `Failed to initialize ${service.getServiceName()} service:`,
            error,
          )
        }
      }
    }
    console.log("No supported AI service found on this page")
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (this.aiService) {
      // Monitor send events (auto-save)
      this.aiService.onSend(this.handleAutoSave.bind(this))

      // Monitor page navigation events
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
  // Session Management
  // ===================

  /**
   * Start session
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
   * End session
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

  // ===================
  // Prompt Saving
  // ===================

  /**
   * Save prompt manually
   */
  async savePromptManually(saveData: SaveDialogData): Promise<Prompt | null> {
    this.ensureInitialized()

    return this.storageHelper.savePromptManually(
      saveData,
      async (prompt) => {
        this.notifyPromptChange(prompt)
        this.notify({
          type: "success",
          message: `Prompt "${prompt.name}" saved successfully`,
          duration: 3000,
        })
        await this.storageHelper.pinPrompt(prompt.id)
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

  async updatePrompt(
    promptId: string,
    saveData: SaveDialogData,
  ): Promise<void> {
    this.ensureInitialized()

    return this.storageHelper.updatePrompt(
      promptId,
      saveData,
      async (prompt) => {
        this.notifyPromptChange(prompt)
        this.notify({
          type: "success",
          message: `Prompt "${prompt.name}" updated successfully`,
          duration: 1000,
        })
      },
      (error) => {
        this.handleError("UPDATE_FAILED", "Failed to update prompt", error)
      },
    )
  }

  /**
   * Auto-save prompt (on send)
   */
  private async handleAutoSave(): Promise<void> {
    if (!this.aiService) return
    await this.storageHelper.handleAutoSave(
      this.aiService,
      (prompt) => {
        this.notifyPromptChange(prompt)
      },
      (error) => {
        console.warn("Auto-save failed:", error)
      },
    )
  }

  /**
   * Delete prompt
   */
  async deletePrompt(promptId: string): Promise<void> {
    this.ensureInitialized()

    await this.storageHelper.deletePrompt(
      promptId,
      (prompt) => {
        this.notifyPromptChange(prompt)
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
   * Pin prompt
   */
  async pinPrompt(promptId: string): Promise<void> {
    this.ensureInitialized()
    try {
      await this.storageHelper.pinPrompt(promptId)
      this.notifyPinChange()
    } catch (error) {
      this.handleError("PIN_FAILED", "Failed to pin prompt", error)
    }
  }

  /**
   * Unpin prompt
   */
  async unpinPrompt(promptId: string): Promise<void> {
    this.ensureInitialized()
    try {
      await this.storageHelper.unpinPrompt(promptId)
      this.notifyPinChange()
    } catch (error) {
      this.handleError("UNPIN_FAILED", "Failed to unpin prompt", error)
    }
  }

  // ===================
  // Prompt Execution & UI
  // ===================

  /**
   * Get text input from AI service.
   * Returns null if AI service is not available.
   */
  getTextInput() {
    if (!this.aiService) {
      this.handleError("EXECUTE_FAILED", "AI service not available", null)
      return null
    }
    return this.aiService.getTextInput()
  }

  /**
   * Get prompt content from AI service.
   * Returns empty string if AI service is not available.
   */
  getPromptContent(): string {
    if (!this.aiService) {
      this.handleError("EXECUTE_FAILED", "AI service not available", null)
      return ""
    }
    return this.aiService.extractPromptContent()
  }

  /**
   * Execute prompt
   */
  async executePrompt(
    promptId: string,
    nodeAtCaret: Node | null,
    match?: AutoCompleteMatch,
  ): Promise<void> {
    this.ensureInitialized()

    if (!this.aiService) {
      this.handleError("EXECUTE_FAILED", "AI service not available", null)
      return
    }

    await this.executeManager.executePrompt(
      promptId,
      this.aiService,
      nodeAtCaret,
      match,
      (prompt) => {
        this.notifyPromptChange(prompt)
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
   * Prepare data for save dialog
   */
  async prepareSaveDialogData(): Promise<{
    initialContent: string
    isOverwriteAvailable: boolean
    initialName?: string
  }> {
    this.ensureInitialized()
    return await this.storageHelper.prepareSaveDialogData(this.aiService)
  }

  /**
   * Get a prompt data
   */
  async getPrompt(promptId: string): Promise<Prompt> {
    this.ensureInitialized()
    return this.storageHelper.getPrompt(promptId)
  }

  /**
   * Get prompts list (sorted)
   */
  async getPrompts(): Promise<Prompt[]> {
    this.ensureInitialized()
    return this.storageHelper.getPrompts()
  }

  /**
   * Get pinned prompts (order preserved)
   */
  async getPinnedPrompts(): Promise<Prompt[]> {
    this.ensureInitialized()
    return this.storageHelper.getPinnedPrompts()
  }

  // ===================
  // Callback Management
  // ===================

  /**
   * Register session change notifications
   */
  onSessionChange(callback: (session: Session | null) => void): void {
    this.onSessionChangeCallbacks.push(callback)
  }

  /**
   * Register prompt change notifications
   */
  onPromptChange(callback: (prompt: Prompt) => void): void {
    this.onPromptChangeCallbacks.push(callback)
  }

  /**
   * Register pin change notifications
   */
  onPinChange(callback: () => void): void {
    this.onPinChangeCallbacks.push(callback)
  }

  /**
   * Register notifications
   */
  onNotification(callback: (notification: NotificationData) => void): void {
    this.onNotificationCallbacks.push(callback)
  }

  /**
   * Register error notifications
   */
  onError(callback: (error: PromptError) => void): void {
    this.onErrorCallbacks.push(callback)
  }

  /**
   * Register content change notifications
   */
  onContentChange(callback: (content: string) => void): () => void {
    if (this.aiService) {
      return this.aiService.onContentChange(callback)
    } else {
      this.handleError(
        "CONTENT_CHANGE_FAILED",
        "AI service not available for element change monitoring",
        null,
      )
    }
    return () => {}
  }

  /**
   * Register element change notifications
   */
  onElementChange(callback: (textInput: Element | null) => void): () => void {
    if (this.aiService) {
      return this.aiService.onElementChange(callback)
    } else {
      this.handleError(
        "ELEMENT_CHANGE_FAILED",
        "AI service not available for element change monitoring",
        null,
      )
    }
    return () => {}
  }

  // ===================
  // Private Methods
  // ===================

  /**
   * Check initialization
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        "PromptServiceFacade not initialized. Call initialize() first.",
      )
    }
  }

  /**
   * Notify session change
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
   * Notify prompt change
   */
  private notifyPromptChange(prompt: Prompt): void {
    this.onPromptChangeCallbacks.forEach((callback) => {
      try {
        callback(prompt)
      } catch (error) {
        console.error("Prompt change callback error:", error)
      }
    })
  }

  /**
   * Notify pin change
   */
  private notifyPinChange(): void {
    this.onPinChangeCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Pin change callback error:", error)
      }
    })
  }

  /**
   * Send notification
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
   * Error handling
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

    // User notification
    this.notify({
      type: "error",
      message: message,
      duration: 5000,
    })

    console.error(`PromptServiceFacade Error [${code}]:`, message, details)
  }

  /**
   * Service cleanup
   */
  destroy(): void {
    if (this.aiService) {
      this.aiService.destroy()
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
    this.onPromptChangeCallbacks = []
    this.onPinChangeCallbacks = []
    this.onNotificationCallbacks = []
    this.onErrorCallbacks = []

    this.aiService = null
    this.initialized = false
  }
}
