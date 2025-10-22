import { StorageService } from "./storage"
import type { AIServiceInterface, PopupPlacement } from "../types/aiService"
import type {
  Prompt,
  Session,
  SaveDialogData,
  NotificationData,
  PromptError,
} from "../types/prompt"
import type { ImportResult } from "./importExport/types"
import { SessionManager } from "./promptHistory/sessionManager"
import { StorageHelper } from "./promptHistory/storageHelper"
import { ExecuteManager } from "./promptHistory/executeManager"
import { getAiServices } from "@/services/aiService"
import { uuid } from "@/lib/utils"
import type { AutoCompleteMatch } from "@/services/autoComplete/types"

/**
 * Main orchestrator for prompt history management
 */
export class PromptServiceFacade {
  private static instance: PromptServiceFacade
  private aiService: AIServiceInterface | null = null
  private sessionManager: SessionManager
  private storageHelper: StorageHelper
  private executeManager: ExecuteManager
  private promptContent: string = ""
  private initialized = false

  // Callbacks
  private onSessionChangeCallbacks: ((session: Session | null) => void)[] = []
  private onNotificationCallbacks: ((
    notification: NotificationData,
  ) => void)[] = []
  private onErrorCallbacks: ((error: PromptError) => void)[] = []

  // unwatch functions
  private promptUnwatchs: (() => void)[] = []

  private constructor() {
    const storage = StorageService.getInstance()
    this.sessionManager = new SessionManager(storage)
    this.storageHelper = new StorageHelper(storage, this.sessionManager)
    this.executeManager = new ExecuteManager(storage, this.sessionManager)
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
      // Initialize AI service (only if supported)
      await this.initializeAIService()

      // Set up event listeners
      this.setupEventListeners()

      // Restore session
      await this.sessionManager.restoreSession()

      this.initialized = true
      this.notify({
        id: uuid(),
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
    // Try each service in order
    const services = await getAiServices()
    for (const service of services) {
      if (service.isSupported()) {
        console.log(`Found supported AI service: ${service.getServiceName()}`)
        try {
          await service.initialize()
          this.aiService = service
          console.log(`${service.getServiceName()} service initialized`)
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

      // Monitor content changes
      this.aiService.onContentChange((content) => {
        this.promptContent = content
      })

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
        this.notify({
          id: uuid(),
          type: "success",
          message: `Prompt "${prompt.name}" saved successfully`,
          duration: 2000,
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
        this.notify({
          id: uuid(),
          type: "success",
          message: `Prompt "${prompt.name}" updated successfully`,
          duration: 2000,
        })
      },
      (error) => {
        this.handleError("UPDATE_FAILED", "Failed to update prompt", error)
      },
    )
  }

  /**
   * Save prompts in bulk (for import operations)
   */
  async saveBulkPrompts(prompts: Prompt[]): Promise<ImportResult> {
    this.ensureInitialized()

    const result = await this.storageHelper.saveBulkPrompts(prompts)

    // Send a summary notification
    if (result.imported > 0) {
      this.notify({
        id: uuid(),
        type: "success",
        message: `Successfully imported ${result.imported} prompts${result.duplicates > 0 ? ` (${result.duplicates} duplicates skipped)` : ""}`,
        duration: 3000,
      })
    }

    return result
  }

  /**
   * Check prompts for bulk saving (for import operations)
   */
  async checkBulkSaving(prompts: Prompt[]): Promise<ImportResult> {
    this.ensureInitialized()
    return await this.storageHelper.checkBulkSaving(prompts)
  }

  /**
   * Auto-save prompt (on send)
   */
  private async handleAutoSave(): Promise<void> {
    if (!this.aiService) return
    await this.storageHelper.handleAutoSave(
      this.promptContent,
      (prompt) => {
        console.debug("Auto-saved success:", prompt.name)
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
        this.notify({
          id: uuid(),
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
   * Get popup placement details from AI service.
   * Returns default placement if AI service is not available.
   */
  getPopupPlacement(): PopupPlacement {
    if (!this.aiService) {
      this.handleError("EXECUTE_FAILED", "AI service not available", null)
      return { sideOffset: 10, alignOffset: 0 }
    }
    return this.aiService.getPopupPlacement()
  }

  /**
   * Get AI service instance (for debugging purposes)
   */
  getAIService(): AIServiceInterface | null {
    return this.aiService
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
        this.notify({
          id: uuid(),
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
   * Register prompt or pin change notifications
   */
  onPromptOrPinChange(callback: () => void): void {
    this.promptUnwatchs.push(
      this.storageHelper.watchPrompts(callback),
      this.storageHelper.watchPinnedPrompts(callback),
      this.storageHelper.watchSortOrder(callback),
    )
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
  private handleError(code: string, message: string, details: unknown): void {
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
      id: uuid(),
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

    this.promptUnwatchs.forEach((unwatch) => unwatch())
    this.promptUnwatchs = []

    this.onSessionChangeCallbacks = []
    this.onNotificationCallbacks = []
    this.onErrorCallbacks = []

    this.aiService = null
    this.initialized = false
  }
}
