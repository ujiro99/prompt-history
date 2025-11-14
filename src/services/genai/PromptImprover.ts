/**
 * Prompt Improver Service
 * Business logic for improving prompts using Gemini AI
 */

import { GeminiClient } from "./GeminiClient"
import type { ImproveOptions } from "./types"
import { GeminiError, GeminiErrorType } from "./types"
import { improvePromptCacheService } from "../storage/improvePromptCache"

/**
 * Default system prompt for prompt improvement (fallback)
 */
const DEFAULT_INSTRUCTION = `You are an excellent Prompt Engineer. Analyze the user's input prompt and improve it to be more effective.

Improvement Guidelines:
- Maintain the intent and purpose of the prompt
- Apply the following improvements as needed:
  * Clarify ambiguous expressions for better clarity
  * Structure with bullet points or sections
  * Add necessary background information or constraints
- Avoid being overly verbose
- Determine the optimal improvement approach based on the prompt's characteristics (simple/complex, technical/general, etc.)

Output only the improved prompt. No explanations or preambles are necessary.`

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
  private systemInstruction: string = DEFAULT_INSTRUCTION

  constructor() {
    this.client = GeminiClient.getInstance()
    // Load system instruction asynchronously
    this.loadSystemInstruction().catch((error) => {
      console.warn("Failed to load system instruction:", error)
    })
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
        systemInstruction: this.systemInstruction,
        generateContentConfig: {
          abortSignal: this.abortController.signal,
        },
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
   * Load system instruction from cache or GitHub Gist
   * 4-tier fallback: Today's cache → Gist fetch → Latest cache → Hardcoded default
   */
  private async loadSystemInstruction(): Promise<void> {
    // 1. Try today's cache
    const cached = await improvePromptCacheService.getTodaysCache()
    if (cached) {
      this.systemInstruction = cached
      return
    }

    // 2. Try fetch from Gist
    try {
      const url = import.meta.env.WXT_IMPROVE_PROMPT_URL
      if (url) {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`)
        }
        const instruction = await response.text()
        // Save to cache
        await improvePromptCacheService.saveCache(instruction)
        this.systemInstruction = instruction
        return
      }
    } catch (error) {
      console.warn("Failed to fetch instruction from Gist:", error)
    }

    // 3. Fallback to latest cache
    const latestCache = await improvePromptCacheService.getLatestCache()
    if (latestCache) {
      this.systemInstruction = latestCache
      return
    }

    // 4. Fallback to hardcoded default
    this.systemInstruction = DEFAULT_INSTRUCTION
  }

  /**
   * Get the system instruction being used
   */
  public getSystemInstruction(): string {
    return this.systemInstruction
  }
}
