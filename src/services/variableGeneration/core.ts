/**
 * Variable Generation Service
 * Integrates with GeminiClient to generate variable preset content using AI
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { GeminiError, GeminiErrorType } from "@/services/genai/types"
import type { Usage } from "@/services/genai/types"
import type { PresetVariableType } from "@/types/prompt"
import type {
  AIGenerationRequest,
  AIGenerationResponse,
} from "@/types/variableGeneration"
import { getSchemaByType } from "./schemas"
import { SYSTEM_INSTRUCTION } from "./defaultPrompts"
import { generateMetaPrompt } from "@/services/variableGeneration/metaPromptGenerator"
import { fetchPromptHistory } from "@/services/variableGeneration/promptHistoryFetcher"
import { i18n } from "#imports"

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
  onProgress?: (
    chunk: string | null,
    accumulated: string,
    tokenUsage: Usage,
  ) => void
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
      i18n.t("variablePresets.aiGeneration.error.apiKeyRequired"),
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
    // Fetch prompt history
    const promptHistory = await fetchPromptHistory()

    // Generate meta-prompt (including existing content and additional instructions if provided)
    const metaPrompt = await generateMetaPrompt({
      variableName: options.request.variableName,
      variablePurpose: options.request.variablePurpose,
      variableType: options.request.variableType,
      existingContent: options.request.existingContent,
      additionalInstructions: options.request.additionalInstructions,
      promptHistory,
    })

    console.log("Generated Meta-Prompt:", metaPrompt)

    // Generate structured content with streaming
    const response =
      await client.generateStructuredContentStream<AIGenerationResponse>(
        metaPrompt,
        schema,
        {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        {
          signal,
          onProgress: (chunk, accumulated, tokenUsage) => {
            onProgress?.(chunk, accumulated, tokenUsage)
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
      i18n.t("variablePresets.aiGeneration.error.missingExplanation"),
      GeminiErrorType.API_ERROR,
    )
  }

  // Validate type-specific fields
  switch (variableType) {
    case "text":
      if (!response.textContent) {
        throw new GeminiError(
          i18n.t("variablePresets.aiGeneration.error.missingTextContent"),
          GeminiErrorType.API_ERROR,
        )
      }
      break

    case "select":
      if (!response.selectOptions || !Array.isArray(response.selectOptions)) {
        throw new GeminiError(
          i18n.t("variablePresets.aiGeneration.error.missingSelectOptions"),
          GeminiErrorType.API_ERROR,
        )
      }
      if (response.selectOptions.length < 3) {
        throw new GeminiError(
          i18n.t("variablePresets.aiGeneration.error.selectOptionsTooFew"),
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
          i18n.t("variablePresets.aiGeneration.error.missingDictionaryItems"),
          GeminiErrorType.API_ERROR,
        )
      }
      if (response.dictionaryItems.length < 3) {
        throw new GeminiError(
          i18n.t("variablePresets.aiGeneration.error.dictionaryItemsTooFew"),
          GeminiErrorType.API_ERROR,
        )
      }
      // Validate each dictionary item
      for (const item of response.dictionaryItems) {
        if (!item.name || !item.content) {
          throw new GeminiError(
            i18n.t("variablePresets.aiGeneration.error.invalidDictionaryItem"),
            GeminiErrorType.API_ERROR,
          )
        }
      }
      break

    default:
      throw new GeminiError(
        i18n.t("variablePresets.aiGeneration.error.unknownVariableType", [
          variableType,
        ]),
        GeminiErrorType.API_ERROR,
      )
  }
}
