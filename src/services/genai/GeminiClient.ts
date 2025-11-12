/**
 * Gemini API Client
 * Singleton wrapper for Google's Gemini AI API
 */

import { GoogleGenAI } from "@google/genai"
import type { GeminiConfig, StreamChunk } from "./types"
import { GeminiError, GeminiErrorType } from "./types"

/**
 * Default Gemini configuration
 */
const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  model: "gemini-2.5-flash",
  temperature: 0.7,
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
          temperature: mergedConfig.temperature,
          maxOutputTokens: mergedConfig.maxOutputTokens,
          systemInstruction: mergedConfig.systemInstruction,
        },
      })

      for await (const chunk of responseStream) {
        console.log("Received chunk:", chunk) // debug log
        if (chunk.text) {
          yield { text: chunk.text }
        }
      }
    } catch (error) {
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

  /**
   * Reset the client (mainly for testing)
   */
  public reset(): void {
    this.ai = null
    this.config = null
  }
}
