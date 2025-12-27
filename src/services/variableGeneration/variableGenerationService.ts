/**
 * Variable Generation Service
 * Integrates with GeminiClient to generate variable preset content using AI
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { GeminiError, GeminiErrorType } from "@/services/genai/types"
import type {
  AIGenerationRequest,
  AIGenerationResponse,
  PresetVariableType,
} from "@/types/prompt"
import { getSchemaByType } from "./schemas"
import { SYSTEM_INSTRUCTION } from "./defaultPrompts"

/**
 * Options for variable generation
 */
export interface GenerateVariableOptions {
  /** Request parameters */
  request: AIGenerationRequest
  /** API key for Gemini */
  apiKey: string
  /** AbortSignal for cancellation */
  signal?: AbortSignal
  /** Progress callback for streaming */
  onProgress?: (chunk: string | null, accumulated: string) => void
}

/**
 * Generate variable content using Gemini AI
 *
 * @param options - Generation options
 * @returns AI-generated response with variable content
 * @throws GeminiError if generation fails
 */
export async function generateVariable(
  options: GenerateVariableOptions,
): Promise<AIGenerationResponse> {
  const { request, apiKey, signal, onProgress } = options

  // Validate API key
  if (!apiKey) {
    throw new GeminiError(
      "API key is required for variable generation",
      GeminiErrorType.API_KEY_MISSING,
    )
  }

  // Get GeminiClient instance
  const client = GeminiClient.getInstance()

  // Initialize client with API key
  if (!client.isInitialized()) {
    client.initialize(apiKey)
  }

  // Get appropriate schema for variable type
  const schema = getSchemaByType(request.variableType)

  try {
    // Generate structured content with streaming
    const response =
      await client.generateStructuredContentStream<AIGenerationResponse>(
        request.metaPrompt,
        schema,
        {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        {
          signal,
          onProgress: (chunk, accumulated, _tokenUsage) => {
            onProgress?.(chunk, accumulated)
          },
        },
      )

    // Validate response structure
    validateResponse(response, request.variableType)

    return response
  } catch (error) {
    // Re-throw GeminiError as-is
    if (error instanceof GeminiError) {
      throw error
    }

    // Wrap other errors
    throw new GeminiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      GeminiErrorType.API_ERROR,
      error,
    )
  }
}

/**
 * Validate AI generation response structure
 *
 * @param response - Response to validate
 * @param variableType - Expected variable type
 * @throws GeminiError if response is invalid
 */
function validateResponse(
  response: AIGenerationResponse,
  variableType: PresetVariableType,
): void {
  // Check for explanation (required in all responses)
  if (!response.explanation) {
    throw new GeminiError(
      "Response missing required field: explanation",
      GeminiErrorType.API_ERROR,
    )
  }

  // Validate type-specific fields
  switch (variableType) {
    case "text":
      if (!response.textContent) {
        throw new GeminiError(
          "Text type response missing textContent field",
          GeminiErrorType.API_ERROR,
        )
      }
      break

    case "select":
      if (!response.selectOptions || !Array.isArray(response.selectOptions)) {
        throw new GeminiError(
          "Select type response missing or invalid selectOptions field",
          GeminiErrorType.API_ERROR,
        )
      }
      if (response.selectOptions.length < 3) {
        throw new GeminiError(
          "Select type response must have at least 3 options",
          GeminiErrorType.API_ERROR,
        )
      }
      break

    case "dictionary":
      if (
        !response.dictionaryItems ||
        !Array.isArray(response.dictionaryItems)
      ) {
        throw new GeminiError(
          "Dictionary type response missing or invalid dictionaryItems field",
          GeminiErrorType.API_ERROR,
        )
      }
      if (response.dictionaryItems.length < 3) {
        throw new GeminiError(
          "Dictionary type response must have at least 3 items",
          GeminiErrorType.API_ERROR,
        )
      }
      // Validate each dictionary item
      for (const item of response.dictionaryItems) {
        if (!item.name || !item.content) {
          throw new GeminiError(
            "Dictionary items must have both name and content fields",
            GeminiErrorType.API_ERROR,
          )
        }
      }
      break

    default:
      throw new GeminiError(
        `Unknown variable type: ${variableType}`,
        GeminiErrorType.API_ERROR,
      )
  }
}
