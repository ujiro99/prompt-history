/**
 * Prompt Organizer types
 */

import type { VariableConfig, PresetVariableType } from "./prompt"

/**
 * Category
 */
export interface Category {
  /** Category ID (UUID) */
  id: string
  /** Category name */
  name: string
  /** Category description (optional) */
  description?: string
  /** Default category flag */
  isDefault: boolean
  /** Created at */
  createdAt: Date
  /** Updated at */
  updatedAt: Date
}

/**
 * Lightweight preset metadata for organization
 */
export interface PresetMetadata {
  /** Preset ID */
  id: string
  /** Preset name */
  name: string
  /** Preset type */
  type: PresetVariableType
  /** Usage description (optional) */
  description?: string
}

/**
 * AI-generated prompt metadata
 */
export interface AIGeneratedMetadata {
  /** Source prompt IDs list */
  sourcePromptIds: string[]
  /** Source prompt count */
  sourceCount: number
  /** User confirmed flag */
  confirmed: boolean
  /** Show in pinned flag */
  showInPinned: boolean
}

/**
 * Template generated from Gemini API
 */
export interface GeneratedTemplate {
  /** Template name */
  title: string
  /** Template content (including variables) */
  content: string
  /** Use case */
  useCase: string
  /** Cluster explanation */
  clusterExplanation: string
  /** Category ID */
  categoryId: string
  /** Source prompt IDs list */
  sourcePromptIds: string[]
  /** Extracted variables from content */
  variables: VariableConfig[]
}

export type UserAction = "pending" | "save" | "save_and_pin" | "discard"

/**
 * Template candidate (displayed in preview screen)
 */
export interface TemplateCandidate {
  /** Candidate ID */
  id: string
  /** Template name */
  title: string
  /** Template content */
  content: string
  /** Use case */
  useCase: string
  /** Cluster explanation */
  clusterExplanation: string
  /** Category ID */
  categoryId: string
  /** Variable list */
  variables: VariableConfig[]
  /** AI metadata */
  aiMetadata: AIGeneratedMetadata
  /** User action */
  userAction: UserAction
}

/**
 * Prompt organizer settings
 */
export interface PromptOrganizerSettings {
  /** Filter period (days) */
  filterPeriodDays: number
  /** Minimum execution count */
  filterMinExecutionCount: number
  /** Maximum prompts */
  filterMaxPrompts: number
  /** Organization prompt */
  organizationPrompt: string
}

/**
 * Prompt data for organization (sent to API)
 */
export interface PromptForOrganization {
  /** Prompt ID */
  id: string
  /** Prompt name */
  name: string
  /** Prompt content */
  content: string
  /** Execution count */
  executionCount: number
}

/**
 * Gemini API response
 */
export interface OrganizePromptsResponse {
  /** List of generated templates */
  prompts: GeneratedTemplate[]
}

/**
 * Prompt organization result
 */
export interface PromptOrganizerResult {
  /** Template candidates */
  templates: TemplateCandidate[]
  /** Source prompt count */
  sourceCount: number
  /** Source prompt IDs */
  sourcePromptIds: string[]
  /** Filter period */
  periodDays: number
  /** Executed at */
  executedAt: Date
  /** Input token count */
  inputTokens: number
  /** Output token count */
  outputTokens: number
  /** Success message for the first template*/
  successMessage?: string
  /** Success message generated flag */
  successMessageGenerated?: boolean
}

/**
 * Token usage
 */
export interface TokenUsage {
  /** Input token count */
  inputTokens: number
  /** Output token count */
  outputTokens: number
  /** Thoughts token count */
  thoughtsTokens: number
}

/**
 * Organizer execution estimate
 */
export interface OrganizerExecutionEstimate {
  /** Target prompt count */
  targetPromptCount: number
  /** Estimated input tokens */
  estimatedInputTokens: number
  /** Estimated output tokens (est.) */
  estimatedOutputTokens: number
  /** Context usage rate (0.0 - 1.0) */
  contextUsageRate: number
  /** Model name */
  model: string
  /** Context limit (tokens) */
  contextLimit: number
}

/**
 * Organizer error
 */
export interface OrganizerError {
  /** Error code */
  code: string
  /** Error message */
  message: string
}

/**
 * Generation progress information
 */
export interface GenerationProgress {
  /** Latest chunk received */
  chunk: string | null
  /** Accumulated response so far */
  accumulated: string
  /** Estimated progress percentage (0-100) */
  estimatedProgress: number
  /** Current status */
  status: "sending" | "thinking" | "generating" | "complete" | "error"
  /** Thoughts tokens */
  thoughtsTokens?: number
  /** Output tokens */
  outputTokens?: number
}

/**
 * Pending organizer templates (stored until user saves or discards)
 */
export interface PendingOrganizerTemplates {
  /** Template candidates */
  templates: TemplateCandidate[]
  /** Last generated at */
  generatedAt: number
}
