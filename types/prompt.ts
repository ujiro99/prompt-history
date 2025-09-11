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
  /** Maximum number of stored prompts */
  maxPrompts: number
  /** Default sort order */
  defaultSortOrder: "recent" | "execution" | "name" | "composite"
  /** Notification display setting */
  showNotifications: boolean
}

/**
 * AI service abstraction interface
 */
export interface AIServiceInterface {
  /** Check if this service is supported */
  isSupported(): boolean
  /** Get text input element */
  getTextInput(): Element | null
  /** Get send button element */
  getSendButton(): Element | null
  /** Extract current prompt content */
  extractPromptContent(): string
  /** Insert prompt content into input field */
  injectPromptContent(content: string): Promise<void>
  /** Set up send event monitoring */
  onSend(callback: () => void): void
  /** Set up content change monitoring */
  onContentChange(callback: (content: string) => void): void
  /** Get service name */
  getServiceName(): string
  /** Get DOM manager (for services that support it) */
  getDomManager?(): any
  /** Service cleanup */
  destroy(): void
}

/**
 * DOM selector definitions for ChatGPT
 */
export interface ChatGPTSelectors {
  /** Text input selectors (fallback array) */
  textInput: string[]
  /** Send button selectors (fallback array) */
  sendButton: string[]
  /** Chat history selectors (fallback array) */
  chatHistory: string[]
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
export type SortOrder = "recent" | "execution" | "name" | "pinned" | "composite"

/**
 * Prompt search and filtering conditions
 */
export interface PromptFilter {
  /** Keyword search */
  keyword?: string
  /** Show only pinned prompts */
  pinnedOnly?: boolean
  /** Sort order */
  sortOrder?: SortOrder
}

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
