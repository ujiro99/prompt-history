/**
 * Meta-Prompt Generator
 * Generates meta-prompts for AI variable generation by replacing template variables
 */

import type { PresetVariableType } from "@/types/prompt"
import { variableGenerationSettingsStorage } from "@/services/storage/definitions"
import { i18n } from "#imports"
import { DEFAULT_META_PROMPT } from "@/services/variableGeneration/defaultPrompts"

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
  const { variableName, variablePurpose, variableType, promptHistory } = options

  // Load settings to determine which template to use
  const settings = await variableGenerationSettingsStorage.getValue()

  // Select template (custom or default)
  const template =
    settings?.useDefault === false && settings?.customPrompt
      ? settings.customPrompt
      : DEFAULT_META_PROMPT

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
