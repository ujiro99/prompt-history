// Type definitions for import/export functionality

import type { Prompt, AppSettings } from "@/types/prompt"

/**
 * Export data structure for CSV format
 */
export interface ExportData {
  /** Export version for compatibility */
  version: string
  /** Export timestamp */
  exportDate: string
  /** Exported prompts */
  prompts: Prompt[]
  /** Application settings */
  settings: AppSettings
}

/**
 * CSV row structure for prompt export
 */
export interface PromptCSVRow {
  name: string
  content: string
  executionCount: number
  lastExecutedAt: string
  isPinned: boolean
  lastExecutionUrl: string
  createdAt: string
  updatedAt: string
  variables?: string // JSON string format
  isAIGenerated?: boolean | string | number // Papa Parse may return various types
  aiMetadata?: string // JSON string format
  categoryId?: string
  useCase?: string
  excludeFromOrganizer?: boolean | string | number // Papa Parse may return various types
}

/**
 * Import result information
 */
export interface ImportResult {
  /** Number of successfully imported prompts */
  imported: number
  /** Number of prompts that already existed */
  duplicates: number
  /** List of missing preset IDs that were converted to text type */
  missingPresets?: string[]
}

/**
 * Import error information
 */
export interface ImportError {
  /** Number of prompts that failed to import */
  errors: number
  /** Error messages if any */
  errorMessages: string[]
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Include pinned prompts only */
  pinnedOnly?: boolean
  /** Date range filter */
  dateRange?: {
    from: Date
    to: Date
  }
}
