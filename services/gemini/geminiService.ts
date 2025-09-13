import type { AIServiceInterface } from "../../types/prompt"
import { DomManager } from "./domManager"
import { GeminiDebugger } from "./geminiDebugger"

/**
 * Google Gemini AI service implementation
 */
export class GeminiService implements AIServiceInterface {
  private domManager: DomManager
  private debugger: GeminiDebugger

  constructor() {
    this.domManager = new DomManager()
    this.debugger = new GeminiDebugger()
  }

  /**
   * Check if current site is Google Gemini
   */
  isSupported(): boolean {
    const hostname = window.location.hostname
    const pathname = window.location.pathname

    console.log("GeminiService: Checking support for hostname", hostname)

    return (
      hostname === "gemini.google.com" ||
      hostname === "bard.google.com" || // Old Bard domain
      hostname === "aistudio.google.com" ||
      (hostname.endsWith(".google.com") && pathname.includes("gemini")) ||
      hostname === "ujiro99.github.io" // For testing
    )
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Gemini service is not supported on this site")
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
    return "Gemini"
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
  getElementInfo(): {
    textInput: { found: boolean; selector?: string; tagName?: string }
    sendButton: { found: boolean; selector?: string; tagName?: string }
  } {
    return this.debugger.getElementInfo()
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
