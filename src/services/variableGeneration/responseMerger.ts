/**
 * Response Merger
 * Merges AI-generated content with existing variable content
 */

import type {
  PresetVariableType,
  VariablePreset,
  DictionaryItem,
} from "@/types/prompt"
import type {
  AIGenerationResponse,
  MergedAIGenerationResponse,
  ExistingVariableContent,
} from "@/types/variableGeneration"
import { generateDictItemId } from "@/utils/idGenerator"

/**
 * Merge AI-generated response with existing variable content
 *
 * @param response - AI-generated response
 * @param variableType - Variable type
 * @param existingContent - Existing variable content (optional)
 * @returns Merged response
 */
export function mergeResponse(
  response: AIGenerationResponse,
  variableType: PresetVariableType,
  existingContent?: ExistingVariableContent,
): MergedAIGenerationResponse {
  switch (variableType) {
    case "text":
      return mergeTextContent(response, existingContent)

    case "select":
      return mergeSelectOptions(response, existingContent)

    case "dictionary":
      return mergeDictionaryItems(response, existingContent)

    default: {
      // For unknown types, return without dictionaryItems to satisfy type
      const { dictionaryItems: _dictionaryItems, ...rest } = response
      return rest
    }
  }
}

/**
 * Merge text content
 * Overwrites existing text content with generated content.
 */
function mergeTextContent(
  response: AIGenerationResponse,
  existingContent?: ExistingVariableContent,
): MergedAIGenerationResponse {
  // Exclude dictionaryItems to satisfy MergedAIGenerationResponse type
  const { dictionaryItems: _dictionaryItems, ...rest } = response

  if (
    !existingContent ||
    !existingContent.textContent ||
    !response.textContent
  ) {
    return rest
  }

  return {
    ...rest,
    textContent: `${response.textContent}`,
  }
}

/**
 * Merge select options
 * Combines existing and generated options, removing duplicates
 */
function mergeSelectOptions(
  response: AIGenerationResponse,
  existingContent?: ExistingVariableContent,
): MergedAIGenerationResponse {
  // Exclude dictionaryItems to satisfy MergedAIGenerationResponse type
  const { dictionaryItems: _dictionaryItems, ...rest } = response

  if (
    !existingContent ||
    !existingContent.selectOptions ||
    !response.selectOptions
  ) {
    return rest
  }

  // Combine arrays and remove duplicates (case-sensitive)
  const combined = [...existingContent.selectOptions, ...response.selectOptions]
  const unique = Array.from(new Set(combined))

  return {
    ...rest,
    selectOptions: unique,
  }
}

/**
 * Merge dictionary items
 * Combines existing and generated items (existing items first)
 */
function mergeDictionaryItems(
  response: AIGenerationResponse,
  existingContent?: ExistingVariableContent,
): MergedAIGenerationResponse {
  // Combine arrays (existing items first, then generated items)
  const combined = [
    ...(existingContent?.dictionaryItems || []),
    ...convertDictionaryItems(response.dictionaryItems || []),
  ]

  return {
    ...response,
    dictionaryItems: combined,
  }
}

/**
 * Convert AI-generated dictionary items to DictionaryItem format
 * Sets isAiGenerated flag for each item
 */
function convertDictionaryItems(
  items: { name: string; content: string }[],
): DictionaryItem[] {
  return items.map((item) => ({
    id: generateDictItemId(),
    name: item.name,
    content: item.content,
    isAiGenerated: true,
  }))
}
/**
 * Apply AI-generated response to existing preset
 * Updates preset with AI-generated content while preserving other fields
 *
 * @param preset - Existing variable preset
 * @param response - Merged AI generation response (with IDs added to dictionary items)
 * @returns Updated preset with AI-generated content
 */
export function applyResponseToPreset(
  preset: VariablePreset,
  response: MergedAIGenerationResponse,
): VariablePreset {
  // Prepare base updates
  const updates: Partial<VariablePreset> = {
    aiExplanation: response.explanation,
    updatedAt: new Date(),
    isAiGenerated: true,
  }

  // Apply generated content based on variable type
  switch (preset.type) {
    case "text":
      updates.textContent = response.textContent || ""
      break

    case "select":
      updates.selectOptions = response.selectOptions || []
      break

    case "dictionary":
      updates.dictionaryItems = response.dictionaryItems
      break
  }

  return {
    ...preset,
    ...updates,
  }
}
