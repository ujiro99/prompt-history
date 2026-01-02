// Type definitions for prompt management functionality

import type { AIGeneratedMetadata } from "./promptOrganizer"

/**
 * Variable type
 */
export type VariableType = "text" | "select" | "exclude" | "preset"

/**
 * Variable preset type
 */
export type PresetVariableType = "text" | "select" | "dictionary"

/**
 * Select options configuration (for extensibility)
 */
export interface SelectOptions {
  /** List of options */
  options: string[]
  // Future extension fields (examples)
  // allowCustomInput?: boolean  // Allow custom input
  // multiSelect?: boolean        // Allow multiple selection
}

export interface PresetOptions {
  presetId?: string
  default?: string // Default value or dictionary item ID
}

/**
 * Dictionary item for dictionary-type presets
 */
export interface DictionaryItem {
  /** Item ID (UUID, for internal management) */
  id: string
  /** Item name (displayed in dropdown) */
  name: string
  /** Item content (multi-line string, expanded when selected) */
  content: string
  /** Whether this dictionary item was AI-generated */
  isAiGenerated?: boolean
}

/**
 * Variable preset definition
 */
export interface VariablePreset {
  /** Preset ID (UUID) */
  id: string
  /** Preset name (displayed in UI) */
  name: string
  /** Preset type */
  type: PresetVariableType
  /** Usage description (optional) */
  description?: string
  /** [Text type only] Text content */
  textContent?: string
  /** [Select type only] Option list */
  selectOptions?: string[]
  /** [Dictionary type only] Dictionary items */
  dictionaryItems?: DictionaryItem[]
  /** Whether this variable preset was AI-generated */
  isAiGenerated?: boolean
  /** AI generation explanation (reasoning for the generated content) */
  aiExplanation?: string
  /** Creation date */
  createdAt: Date
  /** Update date */
  updatedAt: Date
}

/**
 * Variable preset for storage (dates as ISO strings)
 */
export interface StoredVariablePreset
  extends Omit<VariablePreset, "createdAt" | "updatedAt"> {
  createdAt: string
  updatedAt: string
}

/**
 * Variable configuration
 */
export interface VariableConfig {
  /** Variable name */
  name: string
  /** Variable type */
  type: VariableType
  /** Default value */
  defaultValue?: string
  /** Select options (when type='select') */
  selectOptions?: SelectOptions
  /** Preset options (when type='preset') */
  presetOptions?: PresetOptions
}

/**
 * Variable input values
 */
export interface VariableValues {
  [variableName: string]: string
}

/**
 * Basic structure of prompt data
 */
export interface Prompt {
  /** Unique identifier for prompt (UUID) */
  id: string
  /** Prompt name */
  name: string
  /** Prompt content */
  content: string
  /** Execution count */
  executionCount: number
  /** Latest execution date */
  lastExecutedAt: Date
  /** Pin flag */
  isPinned: boolean
  /** Last execution URL */
  lastExecutionUrl: string
  /** Creation date */
  createdAt: Date
  /** Update date */
  updatedAt: Date
  /** Variable configurations */
  variables?: VariableConfig[]
  /** AI-generated flag */
  isAIGenerated?: boolean
  /** AI generation metadata (only for AI-generated prompts) */
  aiMetadata?: AIGeneratedMetadata
  /** Category ID (null for uncategorized) */
  categoryId?: string | null
  /** Use case description (optional) */
  useCase?: string
  /** Exclude from prompt organizer flag */
  excludeFromOrganizer?: boolean
}

/**
 * Prompt data for storage (date fields are ISO strings)
 */
export interface StoredPrompt
  extends Omit<Prompt, "lastExecutedAt" | "createdAt" | "updatedAt"> {
  /** Latest execution date */
  lastExecutedAt: string
  /** Creation date */
  createdAt: string
  /** Update date */
  updatedAt: string
}

/**
 * Session state management
 */
export interface Session {
  /** Active prompt ID (null if no session) */
  activePromptId: string | null
  /** Session start URL */
  url: string
  /** Session start time */
  startedAt: Date
}

/**
 * Save mode for prompt
 */
export enum SaveMode {
  New = "new",
  Overwrite = "overwrite",
  Copy = "copy",
}

/**
 * Prompt save data
 */
export interface SaveDialogData
  extends Pick<
    Prompt,
    | "name"
    | "content"
    | "isPinned"
    | "variables"
    | "isAIGenerated"
    | "aiMetadata"
    | "categoryId"
    | "useCase"
    | "excludeFromOrganizer"
  > {
  /** Save mode */
  saveMode: SaveMode
}

/**
 * Input data for prompt improvement
 */
export interface ImprovePromptData {
  content: string
  variables?: VariableConfig[]
}

/**
 * Input method for prompt improver's system prompt.
 */
export enum ImprovePromptInputMethod {
  Text = "text",
  URL = "url",
}

/**
 * Settings for prompt improver feature
 */
export interface ImprovePromptSettings {
  /** Input method */
  mode: ImprovePromptInputMethod
  /** Direct text input content */
  textContent: string
  /** URL content (GitHub Gist, etc.) */
  urlContent: string
  /** Last modified timestamp */
  lastModified: number
}

/**
 * Type of data to be stored in storage
 */
export interface StorageData {
  /** Prompt list */
  prompts: Record<string, Prompt>
  /** Current session state */
  session: Session | null
  /** Order of pinned prompts */
  pinnedOrder: string[]
  /** Application settings */
  settings: AppSettings
  /** Categories */
  categories?: Record<string, import("./promptOrganizer").Category>
  /** Variable presets */
  variablePresets?: Record<string, VariablePreset>
}

/**
 * Menu type specific settings
 */
export interface MenuTypeSettings {
  /** Sort order for this menu type */
  sortOrder?: SortOrder
  /** Whether to hide automatically organized prompts */
  hideOrganizerExcluded?: boolean
}

/**
 * Application settings
 */
export interface AppSettings {
  /** Enable/disable auto-save feature */
  autoSaveEnabled: boolean
  /** Enable/disable auto-complete feature */
  autoCompleteEnabled: boolean
  /** Maximum number of stored prompts */
  maxPrompts: number
  /** Default sort order(deprecated) */
  sortOrder?: SortOrder
  /** Notification display setting */
  showNotifications: boolean
  /** Enable/disable minimal mode */
  minimalMode?: boolean
  /** Auto-complete target selection */
  autoCompleteTarget?: "all" | "pinned"
  /** Enable/disable variable expansion feature */
  variableExpansionEnabled?: boolean
  /** Settings specific to history menu */
  historySettings?: MenuTypeSettings
  /** Settings specific to pinned menu */
  pinnedSettings?: MenuTypeSettings
}

/**
 * Data for prompt list display
 */
export interface PromptListItem {
  /** Basic prompt information */
  prompt: Prompt
  /** Truncated content for display */
  truncatedContent: string
  /** Time elapsed since last execution (for display) */
  relativeLastExecuted: string
}

/**
 * Sort order setting
 */
export type SortOrder = "recent" | "execution" | "name" | "composite"

/**
 * Grouped prompts for display
 */
export interface PromptGroup {
  /** Group label */
  label: string
  /** Prompts in this group */
  prompts: Prompt[]
  /** Display order of this group */
  order: number
}

/**
 * Function type for grouping prompts
 */
export type GroupingFunction = (prompts: Prompt[]) => PromptGroup[]

/**
 * Error information
 */
export interface PromptError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Error details */
  details?: unknown
}

/**
 * Notification information
 */
export interface NotificationData {
  /** Unique identifier (UUID) */
  id: string
  /** Notification type */
  type: "success" | "error" | "info" | "warning"
  /** Notification message */
  message: string
  /** Auto-dismiss time (ms, 0 for no auto-dismiss) */
  duration?: number
}

/**
 * Prompt statistics information
 */
export interface PromptStats {
  /** Total number of prompts */
  totalPrompts: number
  /** Number of pinned prompts */
  pinnedPrompts: number
  /** Total execution count */
  totalExecutions: number
  /** Most executed prompt */
  mostExecutedPrompt?: Prompt
  /** Recently executed prompt */
  recentlyExecutedPrompt?: Prompt
}
