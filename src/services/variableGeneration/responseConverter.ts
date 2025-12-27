/**
 * Response Converter
 * Converts AI generation response to VariablePreset format
 */

import { uuid } from "@/lib/utils"
import type {
  AIGenerationResponse,
  VariablePreset,
  PresetVariableType,
  DictionaryItem,
} from "@/types/prompt"

/**
 * Convert AI generation response to VariablePreset
 *
 * @param response - AI generation response
 * @param variableType - Variable type
 * @param name - Preset name
 * @param description - Preset description
 * @returns Converted VariablePreset object
 */
export function convertResponseToPreset(
  response: AIGenerationResponse,
  variableType: PresetVariableType,
  name: string,
  description?: string,
): Partial<VariablePreset> {
  const now = new Date()

  // Base preset object
  const basePreset: Partial<VariablePreset> = {
    id: uuid(),
    name,
    type: variableType,
    description,
    isAiGenerated: true,
    aiExplanation: response.explanation,
    createdAt: now,
    updatedAt: now,
  }

  // Add type-specific content
  switch (variableType) {
    case "text":
      return {
        ...basePreset,
        textContent: response.textContent,
      }

    case "select":
      return {
        ...basePreset,
        selectOptions: response.selectOptions,
      }

    case "dictionary":
      return {
        ...basePreset,
        dictionaryItems: convertDictionaryItems(response.dictionaryItems || []),
      }

    default:
      throw new Error(`Unknown variable type: ${variableType}`)
  }
}

/**
 * Convert AI-generated dictionary items to DictionaryItem format
 * Sets isAiGenerated flag for each item
 *
 * @param items - AI-generated dictionary items
 * @returns Converted DictionaryItem array
 */
function convertDictionaryItems(
  items: { name: string; content: string }[],
): DictionaryItem[] {
  return items.map((item) => ({
    id: uuid(),
    name: item.name,
    content: item.content,
    isAiGenerated: true,
  }))
}

/**
 * Merge AI-generated content into existing preset
 * Preserves existing fields (id, name, description, dates) while updating content
 *
 * @param existingPreset - Existing variable preset
 * @param response - AI generation response
 * @returns Updated preset with AI-generated content
 */
export function mergeResponseIntoPreset(
  existingPreset: VariablePreset,
  response: AIGenerationResponse,
): VariablePreset {
  const updatedPreset: VariablePreset = {
    ...existingPreset,
    isAiGenerated: true,
    aiExplanation: response.explanation,
    updatedAt: new Date(),
  }

  // Update type-specific content
  switch (existingPreset.type) {
    case "text":
      updatedPreset.textContent = response.textContent
      break

    case "select":
      updatedPreset.selectOptions = response.selectOptions
      break

    case "dictionary":
      updatedPreset.dictionaryItems = convertDictionaryItems(
        response.dictionaryItems || [],
      )
      break
  }

  return updatedPreset
}
