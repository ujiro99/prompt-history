/**
 * Gemini API Client
 * Singleton wrapper for Google's Gemini AI API
 */

import { GoogleGenAI } from "@google/genai"
import type { GeminiConfig, StreamChunk, TokenUsage } from "./types"
import { GeminiError, GeminiErrorType } from "./types"

/**
 * Default Gemini configuration
 */
const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  model: "gemini-2.5-flash",
  generateContentConfig: {
    thinkingConfig: {
      includeThoughts: true,
      thinkingBudget: -1,
    },
  },
}

/**
 * Gemini API Client singleton class
 */
export class GeminiClient {
  private static instance: GeminiClient | null = null
  private ai: GoogleGenAI | null = null
  private config: GeminiConfig | null = null

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient()
    }
    return GeminiClient.instance
  }

  /**
   * Initialize the Gemini client with API key
   * @param apiKey - Gemini API key
   */
  public initialize(apiKey: string): void {
    if (!apiKey) {
      throw new GeminiError(
        "API key is required",
        GeminiErrorType.API_KEY_MISSING,
      )
    }

    this.ai = new GoogleGenAI({ apiKey })
    this.config = {
      ...DEFAULT_CONFIG,
      apiKey,
    } as GeminiConfig
  }

  /**
   * Check if the client is initialized
   */
  public isInitialized(): boolean {
    return this.ai !== null && this.config !== null
  }

  /**
   * Get current configuration
   */
  public getConfig(): GeminiConfig | null {
    return this.config
  }

  /**
   * Generate content stream from Gemini API
   * @param prompt - Input prompt
   * @param config - Optional configuration overrides
   * @returns Async generator yielding stream chunks
   */
  public async *generateContentStream(
    prompt: string,
    config?: Partial<GeminiConfig>,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.ai || !this.config) {
      throw new GeminiError(
        "Client not initialized. Call initialize() first.",
        GeminiErrorType.API_KEY_MISSING,
      )
    }

    const mergedConfig = {
      ...this.config,
      ...config,
    }

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: mergedConfig.model,
        contents: [prompt],
        config: {
          systemInstruction: mergedConfig.systemInstruction,
          ...mergedConfig.generateContentConfig,
        },
      })

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield { text: chunk.text }
        }
      }
    } catch (error) {
      this.errorHandler(error)
    }
  }

  /**
   * Generate structured JSON content stream from Gemini API
   * Combines structured output with streaming for real-time progress
   * @param prompt - Input prompt
   * @param schema - JSON schema for structured output
   * @param config - Optional configuration overrides
   * @param options - Streaming options (abort signal, progress callback)
   * @returns Promise resolving to parsed JSON response
   */
  public async generateStructuredContentStream<T = unknown>(
    prompt: string,
    schema: Record<string, unknown>,
    config?: Partial<GeminiConfig>,
    options?: {
      signal?: AbortSignal
      onProgress?: (
        chunk: string | null,
        accumulated: string,
        tokenUsage: TokenUsage,
      ) => void
    },
  ): Promise<T> {
    if (!this.ai || !this.config) {
      throw new GeminiError(
        "Client not initialized. Call initialize() first.",
        GeminiErrorType.API_KEY_MISSING,
      )
    }

    const mergedConfig = {
      ...this.config,
      ...config,
    }

    let accumulated = ""

    try {
      // Check if already cancelled before starting
      if (options?.signal?.aborted) {
        throw new GeminiError(
          "Request cancelled before start",
          GeminiErrorType.CANCELLED,
        )
      }

      // Start streaming with structured output
      const responseStream = await this.ai.models.generateContentStream({
        model: mergedConfig.model,
        contents: [prompt],
        config: {
          systemInstruction: mergedConfig.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema,
          ...mergedConfig.generateContentConfig,
        },
      })

      // Process stream chunks
      for await (const chunk of responseStream) {
        // Check cancellation on each chunk
        if (options?.signal?.aborted) {
          throw new GeminiError("Request cancelled", GeminiErrorType.CANCELLED)
        }

        console.log(chunk)

        if (chunk.text) {
          accumulated += chunk.text
        }

        // Notify progress with partial JSON
        options?.onProgress?.(chunk.text ?? null, accumulated, {
          prompt: chunk.usageMetadata?.promptTokenCount || 0,
          thoughts: chunk.usageMetadata?.thoughtsTokenCount || 0,
          candidates: chunk.usageMetadata?.candidatesTokenCount || 0,
        })
      }

      // Parse final complete JSON
      if (!accumulated) {
        throw new GeminiError("No response from API", GeminiErrorType.API_ERROR)
      }

      return JSON.parse(accumulated) as T
    } catch (error) {
      // Handle cancellation explicitly
      if (
        options?.signal?.aborted ||
        (error instanceof GeminiError &&
          error.type === GeminiErrorType.CANCELLED)
      ) {
        throw new GeminiError(
          "Request cancelled by user",
          GeminiErrorType.CANCELLED,
        )
      }
      this.errorHandler(error)
    }
  }

  /**
   * Estimate token usage for a given prompt
   * @param prompt - Input prompt
   * @param config - Optional configuration overrides
   * @returns Estimated token count
   */
  public async estimateTokens(
    prompt: string,
    config?: Partial<GeminiConfig>,
  ): Promise<number> {
    if (!this.ai || !this.config) {
      throw new GeminiError(
        "Client not initialized. Call initialize() first.",
        GeminiErrorType.API_KEY_MISSING,
      )
    }

    const mergedConfig = {
      ...this.config,
      ...config,
    }

    try {
      // Simple token count without schema
      // Gemini API does not currently support schema-based token estimation
      const res = await this.ai.models.countTokens({
        model: mergedConfig.model,
        contents: [prompt],
        config: mergedConfig,
      })
      return res.totalTokens || 0
    } catch (error) {
      this.errorHandler(error)
    }
  }

  /**
   * Reset the client (mainly for testing)
   */
  public reset(): void {
    this.ai = null
    this.config = null
  }

  /**
   * Handle errors from Gemini API
   *  * @param error - Original error
   *  * @throws GeminiError with appropriate type and message
   */
  private errorHandler(error: unknown): never {
    if (error instanceof GeminiError) {
      throw error
    }
    // Handle different error types
    if (error instanceof Error) {
      if (error.message.includes("network")) {
        throw new GeminiError(
          "Network error. Please check your connection.",
          GeminiErrorType.NETWORK_ERROR,
          error,
        )
      } else if (error.message.includes("API key")) {
        throw new GeminiError(
          "Invalid API key.",
          GeminiErrorType.API_KEY_MISSING,
          error,
        )
      } else {
        throw new GeminiError(
          `API error: ${error.message}`,
          GeminiErrorType.API_ERROR,
          error,
        )
      }
    }
    throw new GeminiError(
      "Unknown error occurred",
      GeminiErrorType.API_ERROR,
      error,
    )
  }
}
