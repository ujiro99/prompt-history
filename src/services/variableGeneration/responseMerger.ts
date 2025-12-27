/**
 * Response Merger
 * Merges AI-generated content with existing variable content
 */

import type {
  AIGenerationResponse,
  ExistingVariableContent,
  PresetVariableType,
  DictionaryItem,
} from "@/types/prompt"
import { uuid } from "@/lib/utils"

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
): AIGenerationResponse {
  if (!existingContent) {
    return response
  }

  switch (variableType) {
    case "text":
      return mergeTextContent(response, existingContent)

    case "select":
      return mergeSelectOptions(response, existingContent)

    case "dictionary":
      return mergeDictionaryItems(response, existingContent)

    default:
      return response
  }
}

/**
 * Merge text content
 * Overwrites existing text content with generated content.
 */
function mergeTextContent(
  response: AIGenerationResponse,
  existingContent: ExistingVariableContent,
): AIGenerationResponse {
  if (!existingContent.textContent || !response.textContent) {
    return response
  }

  return {
    ...response,
    textContent: `${response.textContent}`,
  }
}

/**
 * Merge select options
 * Combines existing and generated options, removing duplicates
 */
function mergeSelectOptions(
  response: AIGenerationResponse,
  existingContent: ExistingVariableContent,
): AIGenerationResponse {
  if (!existingContent.selectOptions || !response.selectOptions) {
    return response
  }

  // Combine arrays and remove duplicates (case-sensitive)
  const combined = [...existingContent.selectOptions, ...response.selectOptions]
  const unique = Array.from(new Set(combined))

  return {
    ...response,
    selectOptions: unique,
  }
}

/**
 * Merge dictionary items
 * Combines existing and generated items (existing items first)
 */
function mergeDictionaryItems(
  response: AIGenerationResponse,
  existingContent: ExistingVariableContent,
): AIGenerationResponse {
  if (!existingContent.dictionaryItems || !response.dictionaryItems) {
    return response
  }

  // Convert generated items to DictionaryItem format with isAiGenerated flag
  const generatedItems: DictionaryItem[] = response.dictionaryItems.map(
    (item) => ({
      id: uuid(),
      name: item.name,
      content: item.content,
      isAiGenerated: true,
    }),
  )

  // Combine arrays (existing items first, then generated items)
  const combined = [...existingContent.dictionaryItems, ...generatedItems]

  return {
    ...response,
    dictionaryItems: combined.map((item) => ({
      name: item.name,
      content: item.content,
    })),
  }
}
