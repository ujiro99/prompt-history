/**
 * Meta-Prompt Generator
 * Generates meta-prompts for AI variable generation by replacing template variables
 */

import type { PresetVariableType } from "@/types/prompt"
import type {
  ExistingVariableContent,
  VariableGenerationSettings,
} from "@/types/variableGeneration"
import { variableGenerationSettingsStorage } from "@/services/storage/definitions"
import { i18n } from "#imports"
import {
  DEFAULT_META_PROMPT,
  INPUT_SECTION,
  ADDITION_TO_EXISTING_VARIABLES,
  MODIFICATION_TO_EXISTING_VARIABLES,
  ADDITIONAL_INSTRUCTIONS,
} from "@/services/variableGeneration/defaultPrompts"
import { WatchCallback } from "wxt/utils/storage"

/**
 * Format existing variable content for meta-prompt
 *
 * @param existingContent - Existing variable content
 * @param variableType - Variable type
 * @returns Formatted string for meta-prompt
 */
function formatExistingContent(
  existingContent: ExistingVariableContent,
  variableType: PresetVariableType,
): string {
  switch (variableType) {
    case "text":
      if (existingContent.textContent) {
        return `Existing text content:\n${existingContent.textContent}`
      }
      return ""

    case "select":
      if (
        existingContent.selectOptions &&
        existingContent.selectOptions.length > 0
      ) {
        return `Existing options: ${existingContent.selectOptions.join(", ")}`
      }
      return ""

    case "dictionary":
      if (
        existingContent.dictionaryItems &&
        existingContent.dictionaryItems.length > 0
      ) {
        const items = existingContent.dictionaryItems
          .map((item) => {
            const contentPreview = item.content.slice(0, 100)
            const ellipsis = item.content.length > 100 ? "..." : ""
            return `- ${item.name}: ${contentPreview}${ellipsis}`
          })
          .join("\n")
        return `Existing dictionary items:\n${items}`
      }
      return ""

    default:
      return ""
  }
}

/**
 * Replace template variables in meta-prompt
 *
 * @param template - Meta-prompt template with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns Meta-prompt with variables replaced
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, "g"), value)
  }

  return result
}

/**
 * Options for generating meta-prompt
 */
export interface GenerateMetaPromptOptions {
  /** Variable name */
  variableName: string
  /** Variable purpose/description */
  variablePurpose: string
  /** Variable type (text / select / dictionary) */
  variableType: PresetVariableType
  /** Prompt history (concatenated text) */
  promptHistory: string
  /** Existing variable content (optional) */
  existingContent?: ExistingVariableContent
  /** Additional instructions from user (optional) */
  additionalInstructions?: string
}

/**
 * Generate meta-prompt for AI variable generation
 * Uses custom prompt from settings if available, otherwise uses default template
 *
 * @param options - Meta-prompt generation options
 * @returns Generated meta-prompt with variables replaced
 */
export async function generateMetaPrompt(
  options: GenerateMetaPromptOptions,
): Promise<string> {
  const {
    variableName,
    variablePurpose,
    variableType,
    promptHistory,
    existingContent,
    additionalInstructions,
  } = options

  // Load settings to determine which template to use
  const settings = await variableGenerationSettingsStorage.getValue()

  // Select template (custom or default)
  let template =
    settings?.useDefault === false && settings?.customPrompt
      ? settings.customPrompt
      : DEFAULT_META_PROMPT

  // Add existing variable section if provided
  if (existingContent) {
    const formattedExisting = formatExistingContent(
      existingContent,
      variableType,
    )
    if (formattedExisting) {
      if (variableType === "text") {
        const existingSection = `\n\n${MODIFICATION_TO_EXISTING_VARIABLES}\n\n${formattedExisting}`
        template += existingSection
      } else {
        const existingSection = `\n\n${ADDITION_TO_EXISTING_VARIABLES}\n\n${formattedExisting}`
        template += existingSection
      }
    }
  }

  // Add additional instructions if provided
  if (additionalInstructions && additionalInstructions.trim()) {
    const instructionsSection = `\n\n${ADDITIONAL_INSTRUCTIONS}\n\n${additionalInstructions.trim()}`
    template = template + instructionsSection
  }

  // Append input section
  template = template + `\n\n${INPUT_SECTION}`

  // Prepare variables for replacement
  const variables = {
    variable_name: variableName,
    variable_purpose: variablePurpose,
    variable_type: i18n.t(`variableTypes.${variableType}`),
    prompt_history: promptHistory || "(no prompt history available)",
  }

  // Replace template variables
  return replaceTemplateVariables(template, variables)
}

/**
 * Get number of prompt history items to use from settings
 *
 * @returns Number of prompt history items (default: 200)
 */
export async function getPromptHistoryCount(): Promise<number> {
  const settings = await variableGenerationSettingsStorage.getValue()
  return settings?.promptHistoryCount ?? 200
}

/**
 * Watch for changes in variable generation setting
 *
 * @param cb - Callback function to invoke on changes
 * @return Unsubscribe function
 */
export function watch(cb: WatchCallback<VariableGenerationSettings>) {
  return variableGenerationSettingsStorage.watch(cb)
}
