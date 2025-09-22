// Type definitions for prompt management functionality

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
  autoCompleteEnabled?: boolean
  /** Maximum number of stored prompts */
  maxPrompts: number
  /** Default sort order */
  sortOrder: SortOrder
  /** Notification display setting */
  showNotifications: boolean
  /** Enable/disable minimal mode */
  minimalMode?: boolean
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
 * Error information
 */
export interface PromptError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Error details */
  details?: any
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
