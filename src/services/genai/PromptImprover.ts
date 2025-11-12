/**
 * Prompt Improver Service
 * Business logic for improving prompts using Gemini AI
 */

import { GeminiClient } from "./GeminiClient"
import type { ImproveOptions } from "./types"
import { GeminiError, GeminiErrorType } from "./types"

/**
 * System prompt for prompt improvement
 */
const SYSTEM_INSTRUCTION = `あなたは優れたPrompt Engineerです。ユーザーが入力したプロンプトを分析し、より効果的なプロンプトに改善してください。

改善の指針:
- プロンプトの意図と目的を維持する
- 必要に応じて以下の改善を適用する：
  * 曖昧な表現を具体化して明確性を向上
  * 箇条書きやセクション分けで構造化
  * 必要な背景情報や制約条件を補完
- 冗長にならないよう配慮する
- プロンプトの特性（シンプル/複雑、技術的/一般的など）に応じて最適な改善方法を判断する

改善されたプロンプトのみを出力してください。説明や前置きは不要です。`

/**
 * Default timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Prompt Improver Service
 */
export class PromptImprover {
  private client: GeminiClient
  private abortController: AbortController | null = null
  private timeoutId: number | null = null

  constructor() {
    this.client = GeminiClient.getInstance()
  }

  /**
   * Initialize with API key from environment
   */
  public initializeFromEnv(): void {
    const apiKey = import.meta.env.WXT_GENAI_API_KEY
    if (!apiKey) {
      throw new GeminiError(
        "API key not found in environment variables",
        GeminiErrorType.API_KEY_MISSING,
      )
    }
    this.client.initialize(apiKey)
  }

  /**
   * Check if the service is ready
   */
  public isReady(): boolean {
    return this.client.isInitialized()
  }

  /**
   * Improve a prompt using Gemini AI
   * @param options - Improvement options including callbacks
   */
  public async improvePrompt(options: ImproveOptions): Promise<void> {
    const { prompt, onStream, onComplete, onError } = options

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      const error = new GeminiError(
        "Prompt cannot be empty",
        GeminiErrorType.API_ERROR,
      )
      onError?.(error)
      return
    }

    // Initialize if not ready
    if (!this.isReady()) {
      try {
        this.initializeFromEnv()
      } catch (error) {
        onError?.(error as Error)
        return
      }
    }

    // Create abort controller for cancellation
    this.abortController = new AbortController()

    // Setup timeout
    this.timeoutId = window.setTimeout(() => {
      this.cancel()
      const error = new GeminiError(
        "Request timed out. Please try again.",
        GeminiErrorType.TIMEOUT,
      )
      onError?.(error)
    }, DEFAULT_TIMEOUT)

    let improvedPrompt = ""

    try {
      const stream = this.client.generateContentStream(prompt, {
        systemInstruction: SYSTEM_INSTRUCTION,
      })

      for await (const chunk of stream) {
        // Check if cancelled
        if (this.abortController?.signal.aborted) {
          const error = new GeminiError(
            "Request was cancelled",
            GeminiErrorType.CANCELLED,
          )
          onError?.(error)
          return
        }

        improvedPrompt += chunk.text
        onStream?.(chunk.text)
      }

      // Clear timeout on successful completion
      this.clearTimeout()

      // Call completion callback
      onComplete?.(improvedPrompt)
    } catch (error) {
      // Clear timeout on error
      this.clearTimeout()

      // Call error callback
      onError?.(error as Error)
    } finally {
      // Cleanup
      this.abortController = null
    }
  }

  /**
   * Cancel the current improvement operation
   */
  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.clearTimeout()
  }

  /**
   * Clear the timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Get the system instruction being used
   */
  public getSystemInstruction(): string {
    return SYSTEM_INSTRUCTION
  }
}
