// Type definitions for prompt management functionality

/**
 * Variable type
 */
export type VariableType = "text" | "textarea" | "select" | "exclude"

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
}

/**
 * Prompt data for storage (date fields are ISO strings)
 */
export interface StoredPrompt {
  /** Unique identifier for prompt (UUID) */
  id: string
  /** Prompt name */
  name: string
  /** Prompt content */
  content: string
  /** Execution count */
  executionCount: number
  /** Latest execution date */
  lastExecutedAt: string
  /** Pin flag */
  isPinned: boolean
  /** Last execution URL */
  lastExecutionUrl: string
  /** Creation date */
  createdAt: string
  /** Update date */
  updatedAt: string
  /** Variable configurations */
  variables?: VariableConfig[]
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
export interface SaveDialogData {
  /** Prompt name */
  name: string
  /** Prompt content */
  content: string
  /** Save mode */
  saveMode: SaveMode
  /** Pin flag */
  isPinned: boolean
  /** Variable configurations */
  variables?: VariableConfig[]
}

/**
 * Input data for prompt improvement
 */
export interface ImprovePromptData {
  content: string
  variables?: VariableConfig[]
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
  /** Default sort order */
  sortOrder: SortOrder
  /** Notification display setting */
  showNotifications: boolean
  /** Enable/disable minimal mode */
  minimalMode?: boolean
  /** Auto-complete target selection */
  autoCompleteTarget?: "all" | "pinned"
  /** Enable/disable variable expansion feature */
  variableExpansionEnabled?: boolean
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
