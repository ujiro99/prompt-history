import type {
  AIServiceInterface,
  PopupPlacement,
} from "../../../types/aiService"
import type { AIServiceConfig, ServiceElementInfo } from "./types"
import { DomManager } from "../base/domManager"

/**
 * Base class for AI service implementations
 * Provides common functionality and delegates DOM operations to a DomManager
 */
export abstract class BaseAIService implements AIServiceInterface {
  protected domManager: DomManager
  protected config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    this.domManager = new DomManager(config)
    this.config = config

    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      config.isSupported(window.location.hostname, window.location.pathname)
    ) {
      console.debug(`Initialized ${config.serviceName}`)
      ;(window as any).promptHistoryDebug = this
    }
  }

  /**
   * Check if current site is supported by this service
   */
  isSupported(): boolean {
    const hostname = window.location.hostname
    const pathname = window.location.pathname

    // Use custom checker if provided
    return this.config.isSupported(hostname, pathname)
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error(
        `${this.config.serviceName} service is not supported on this site`,
      )
    }

    await this.domManager.waitForElements()
    this.domManager.setupSendEventListeners()
    this.domManager.setupContentChangeListeners()
    this.domManager.setupDOMObserver()
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.config.serviceName
  }

  /**
   * Get text input element
   */
  getTextInput(): Element | null {
    return this.domManager.getTextInput()
  }

  /**
   * Get send button element
   */
  getSendButton(): Element | null {
    return this.domManager.getSendButton()
  }

  /**
   * Get popup placement details
   */
  getPopupPlacement(): PopupPlacement {
    return this.config.popupPlacement
  }

  /**
   * Extract prompt content
   */
  extractPromptContent(): string {
    return this.domManager.getCurrentContent()
  }

  /**
   * Set up send event monitoring
   */
  onSend(callback: () => void): () => void {
    // Create wrapper to check if prompt content is not empty
    const wrappedCallback = () => {
      const content = this.extractPromptContent().trim()
      if (content.length > 0) {
        callback()
      }
    }
    return this.domManager.onSend(wrappedCallback)
  }

  /**
   * Remove send event monitoring
   */
  offSend(callback: () => void): void {
    this.domManager.offSend(callback)
  }

  /**
   * Set up content change monitoring
   */
  onContentChange(callback: (content: string) => void): () => void {
    return this.domManager.onContentChange(callback)
  }

  /**
   * Remove content change monitoring
   */
  offContentChange(callback: () => void): void {
    this.domManager.offContentChange(callback)
  }

  /**
   * Set up element change monitoring.
   * Returns an unsubscribe function.
   */
  onElementChange(callback: (textInput: Element | null) => void): () => void {
    return this.domManager.onElementChange(callback)
  }

  /**
   * Service cleanup
   */
  destroy(): void {
    this.domManager.destroy()
  }

  // ===================
  // Debug & Utilities
  // ===================

  /**
   * Get information about currently detected elements
   */
  getElementInfo(): ServiceElementInfo {
    return this.domManager.getElementInfo()
  }

  /**
   * Run selector tests (to be implemented by subclasses if needed)
   */
  abstract testSelectors(): void
}
