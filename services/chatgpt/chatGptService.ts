import type { AIServiceInterface } from "../../types/prompt"
import { DomManager } from "./domManager"
import { PromptManager } from "./promptManager"
import { ChatGptDebugger } from "./chatGptDebugger"

/**
 * Service implementation for ChatGPT
 * Orchestrates managers and implements AIServiceInterface
 */
export class ChatGptService implements AIServiceInterface {
  private domManager: DomManager
  private promptManager: PromptManager
  private debugger: ChatGptDebugger

  constructor() {
    this.domManager = new DomManager()
    this.promptManager = new PromptManager(this.domManager)
    this.debugger = new ChatGptDebugger()
  }

  /**
   * Check if current site is ChatGPT
   */
  isSupported(): boolean {
    const hostname = window.location.hostname
    return (
      hostname === "chatgpt.com" ||
      hostname === "chat.openai.com" ||
      hostname.endsWith(".openai.com") ||
      hostname === "ujiro99.github.io"
    )
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("ChatGPT service is not supported on this site")
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
    return "ChatGPT"
  }

  /**
   * Get DOM manager
   */
  getDomManager() {
    return this.domManager
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
    return this.promptManager.extractContent()
  }

  /**
   * Inject prompt content
   */
  async injectPromptContent(content: string): Promise<void> {
    return this.promptManager.injectContent(content)
  }

  /**
   * Set up send event monitoring
   */
  onSend(callback: () => void): void {
    // Create wrapper to check if prompt content is not empty
    const wrappedCallback = () => {
      const content = this.extractPromptContent().trim()
      if (content.length > 0) {
        callback()
      }
    }

    this.domManager.onSend(wrappedCallback)
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
  onContentChange(callback: (content: string) => void): void {
    this.domManager.onContentChange(callback)
  }

  /**
   * Remove content change monitoring
   */
  offContentChange(callback: () => void): void {
    this.domManager.offContentChange(callback)
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
