import type { AIServiceInterface } from "../../types/prompt"
import { DomManager } from "./domManager"
import { PromptManager } from "./promptManager"
import { ChatGptDebugger } from "./chatGptDebugger"

/**
 * ChatGPT用のサービス実装
 * 各マネージャーを統括し、AIServiceInterfaceを実装する
 */
export class ChatGptService implements AIServiceInterface {
  private domManager: DomManager
  private promptManager: PromptManager
  private debugger: ChatGptDebugger
  private initialized = false

  constructor() {
    this.domManager = new DomManager()
    this.promptManager = new PromptManager(this.domManager)
    this.debugger = new ChatGptDebugger()
  }

  /**
   * ChatGPTサイト判定
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
   * サービス初期化
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("ChatGPT service is not supported on this site")
    }

    await this.domManager.waitForElements()
    this.domManager.setupEventListeners()
    this.domManager.setupDOMObserver()
    this.initialized = true
  }

  /**
   * サービス名取得
   */
  getServiceName(): string {
    return "ChatGPT"
  }

  /**
   * テキスト入力要素取得
   */
  getTextInput(): Element | null {
    return this.domManager.getTextInput()
  }

  /**
   * 送信ボタン要素取得
   */
  getSendButton(): Element | null {
    return this.domManager.getSendButton()
  }

  /**
   * プロンプト内容抽出
   */
  extractPromptContent(): string {
    return this.promptManager.extractContent()
  }

  /**
   * プロンプト内容挿入
   */
  injectPromptContent(content: string): void {
    this.promptManager.injectContent(content)
  }

  /**
   * 送信イベント監視設定
   */
  onSend(callback: () => void): void {
    // プロンプト内容が空でないかチェックするラッパーを作成
    const wrappedCallback = () => {
      const content = this.extractPromptContent().trim()
      if (content.length > 0) {
        callback()
      }
    }

    this.domManager.onSend(wrappedCallback)
  }

  /**
   * 送信イベント監視解除
   */
  offSend(callback: () => void): void {
    this.domManager.offSend(callback)
  }

  /**
   * サービス終了処理
   */
  destroy(): void {
    this.domManager.destroy()
    this.initialized = false
  }

  // ===================
  // デバッグ・ユーティリティ
  // ===================

  /**
   * 現在検出されている要素情報を取得
   */
  getElementInfo(): {
    textInput: { found: boolean; selector?: string; tagName?: string }
    sendButton: { found: boolean; selector?: string; tagName?: string }
  } {
    return this.debugger.getElementInfo()
  }

  /**
   * セレクタのテスト実行
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
