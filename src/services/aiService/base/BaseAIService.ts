import type {
  AIServiceInterface,
  PopupPlacement,
} from "../../../types/aiService"
import type { AIServiceConfig, ServiceElementInfo } from "./types"
import { DomManager } from "../base/domManager"
import { SelectorDebugger } from "../base/selectorDebugger"
import { extractElementContent } from "@/services/dom"

export type AIServiceConfigProps = Omit<
  AIServiceConfig,
  "extractContent" | "shouldTriggerSend"
>

/**
 * Base class for AI service implementations
 * Provides common functionality and delegates DOM operations to a DomManager
 */
export abstract class BaseAIService implements AIServiceInterface {
  protected domManager: DomManager
  protected config: AIServiceConfig
  protected debugger: SelectorDebugger

  // List of supported hostnames (for quick checks)
  protected supportHosts: string[] = []

  // Legacy mode flag (if true, uses execCommand for text insertion)
  public legacyMode = false

  constructor(config: AIServiceConfigProps, supportHosts: string[]) {
    this.config = {
      ...config,
      extractContent: extractElementContent,
      shouldTriggerSend: this.shouldTriggerSend.bind(this),
    }
    this.supportHosts = supportHosts
    this.domManager = new DomManager(this.config)
    this.debugger = new SelectorDebugger({
      serviceName: config.serviceName,
      textInputSelectors: config.selectors.textInput,
      sendButtonSelectors: config.selectors.sendButton,
    })

    if (
      typeof window !== "undefined" &&
      // eslint-disable-next-line no-undef
      process.env.NODE_ENV !== "production" &&
      this.isSupported()
    ) {
      console.debug(`Initialized ${config.serviceName}`)
    }
  }

  /**
   * Check if current site is supported by this service
   */
  isSupported(): boolean {
    const hostname = window.location.hostname
    return this.supportHosts?.includes(hostname) ?? false
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
   * Get list of supported hostnames
   */
  getSupportHosts(): string[] {
    return this.supportHosts
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
   * Get service configuration
   */
  getConfig(): AIServiceConfig {
    return this.config
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
    return this.domManager.onSend(callback)
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
   * Determine if a keyboard event should trigger sending the prompt.
   * Default implementation: Send with Enter (but not Shift+Enter or Ctrl+Enter), and not during IME composition.
   * Returns true if the event should trigger sending, false otherwise.
   */
  shouldTriggerSend(event: KeyboardEvent): boolean {
    // Send with Enter (but not Shift+Enter or Ctrl+Enter), and not during IME composition
    return (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.isComposing
    )
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
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
