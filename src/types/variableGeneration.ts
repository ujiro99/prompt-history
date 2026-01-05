/**
 * Variable Generation Estimation types
 */

import type { PresetVariableType, DictionaryItem } from "./prompt"

/**
 * Existing variable content for merging with generated content
 */
export interface ExistingVariableContent {
  /** Existing text content (for text type) */
  textContent?: string
  /** Existing select options (for select type) */
  selectOptions?: string[]
  /** Existing dictionary items (for dictionary type) */
  dictionaryItems?: DictionaryItem[]
}

/**
 * AI generation request parameters
 */
export interface AIGenerationRequest {
  /** Variable name */
  variableName: string
  /** Variable purpose/description */
  variablePurpose: string
  /** Variable type (text / select / dictionary) */
  variableType: PresetVariableType
  /** Existing variable content (optional, for merging) */
  existingContent?: ExistingVariableContent
  /** Additional instructions for AI. */
  additionalInstructions?: string
}

/**
 * Dictionary item from AI generation (without id)
 */
export interface GeneratedDictionaryItem {
  /** Item name (displayed in dropdown) */
  name: string
  /** Item content (multi-line string, expanded when selected) */
  content: string
}

/**
 * AI generation response (structured output from Gemini API)
 */
export interface AIGenerationResponse {
  /** AI explanation for the generated content */
  explanation: string
  /** [Text type only] Generated text content */
  textContent?: string
  /** [Select type only] Generated select options */
  selectOptions?: string[]
  /** [Dictionary type only] Generated dictionary items (without id) */
  dictionaryItems?: GeneratedDictionaryItem[]
}

/**
 * Merged AI generation response with IDs added to dictionary items
 */
export interface MergedAIGenerationResponse
  extends Omit<AIGenerationResponse, "dictionaryItems"> {
  /** [Dictionary type only] Dictionary items with IDs */
  dictionaryItems?: DictionaryItem[]
}

/**
 * Variable generation settings
 */
export interface VariableGenerationSettings {
  /** Use default meta-prompt template */
  useDefault: boolean
  /** Custom meta-prompt template (if useDefault is false) */
  customPrompt?: string
  /** Number of prompt history items to use (default: 200) */
  promptHistoryCount: number
}

/**
 * Variable generation execution estimate
 */
export interface VariableGenerationEstimate {
  /** Number of prompt history items used */
  promptHistoryCount: number
  /** Estimated input tokens */
  estimatedInputTokens: number
  /** Context usage rate (0.0 - 1.0) */
  contextUsageRate: number
  /** Model name */
  model: string
  /** Context limit (tokens) */
  contextLimit: number
}
