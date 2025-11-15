import { GenerateContentConfig } from "@google/genai"

/**
 * Type definitions for Gemini AI service
 */

/**
 * Prompt improvement options
 */
export interface ImproveOptions {
  /** Prompt to improve */
  prompt: string
  /** Streaming callback - called for each chunk received */
  onStream?: (chunk: string) => void
  /** Completion callback - called when streaming is complete */
  onComplete?: (improvedPrompt: string) => void
  /** Error callback - called when an error occurs */
  onError?: (error: Error) => void
}

/**
 * Gemini API response chunk
 */
export interface StreamChunk {
  /** Text content of the chunk */
  text: string
}

/**
 * Gemini API configuration
 */
export interface GeminiConfig {
  /** API key for authentication */
  apiKey: string
  /** Model name to use (e.g., "gemini-2.5-flash") */
  model: string
  /** System instruction for the model */
  systemInstruction?: string
  /** Configuration for content generation */
  generateContentConfig?: GenerateContentConfig
}

/**
 * Error types for Gemini API
 */
export enum GeminiErrorType {
  API_KEY_MISSING = "API_KEY_MISSING",
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  TIMEOUT = "TIMEOUT",
  CANCELLED = "CANCELLED",
}

/**
 * Custom error class for Gemini API errors
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public type: GeminiErrorType,
    public originalError?: unknown,
  ) {
    super(message)
    this.name = "GeminiError"
  }
}
