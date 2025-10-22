import Papa from "papaparse"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import type { ImportResult } from "./types"
import type { Prompt, VariableConfig } from "@/types/prompt"
import { generatePromptId } from "@/utils/idGenerator"
import { ImportError } from "./ImportError"
import { i18n } from "#imports"

/**
 * Type for CSV row data from Papa Parse (without id field)
 */
interface CSVRowData {
  name: string
  content: string
  executionCount: number | string
  lastExecutedAt: string
  isPinned: boolean | string
  lastExecutionUrl: string
  createdAt: string
  updatedAt: string
  variables?: string
}

/**
 * Service for importing prompt data
 */
export class PromptImportService {
  private serviceFacade = PromptServiceFacade.getInstance()

  /**
   * Check CSV file for duplicates without importing
   */
  async checkCSVFile(file: File): Promise<ImportResult> {
    this.validateFile(file)
    const csvText = await this.readFileAsText(file)
    const prompts = this.parseCSV(csvText)
    return await this.serviceFacade.checkBulkSaving(prompts)
  }

  /**
   * Process a file directly for import (UI-agnostic)
   */
  async processFile(file: File): Promise<ImportResult> {
    this.validateFile(file)
    const csvText = await this.readFileAsText(file)
    const prompts = this.parseCSV(csvText)
    return await this.importPrompts(prompts)
  }

  /**
   * Validate file before processing
   */
  private validateFile(file: File): void {
    if (!file) {
      throw new Error(i18n.t("importDialog.error.noFile"))
    }

    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      throw new Error(i18n.t("importDialog.error.invalidFileType"))
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error(i18n.t("importDialog.error.fileTooLarge"))
    }

    if (file.size === 0) {
      throw new Error(i18n.t("importDialog.error.emptyFile"))
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        resolve(event.target?.result as string)
      }
      reader.onerror = () => {
        reject(new Error(i18n.t("importDialog.error.readFileFailed")))
      }
      reader.readAsText(file)
    })
  }

  /**
   * Parse CSV text to prompt objects using Papa Parse
   */
  private parseCSV(csvText: string): Prompt[] {
    const parseResult = Papa.parse<CSVRowData>(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    })

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing error:", parseResult.errors)
      const msgs = parseResult.errors.map(
        (e) => (e.row ? `[${e.row + 2}] ${e.message}` : `${e.message}`), // +2 for header and 0-based index
      )
      throw new ImportError(parseResult.errors.length, msgs)
    }

    const prompts: Prompt[] = []
    const errors: string[] = []
    for (let i = 0; i < parseResult.data.length; i++) {
      try {
        const prompt = this.parseRowData(parseResult.data[i])
        prompts.push(prompt)
      } catch (error) {
        errors.push(
          `[${i + 2}] ${error instanceof Error ? error.message : error}`,
        )
      }
    }
    if (errors.length > 0) {
      console.error("CSV parsing error:", errors)
      throw new ImportError(errors.length, errors)
    }

    return prompts
  }

  /**
   * Parse Papa Parse row data to prompt object
   */
  private parseRowData(row: CSVRowData): Prompt {
    const requiredFields = [
      "name",
      "content",
      "executionCount",
      "lastExecutedAt",
      "isPinned",
      "lastExecutionUrl",
      "createdAt",
      "updatedAt",
    ]

    for (const field of requiredFields) {
      if (!(field in row)) {
        throw new Error(i18n.t("importDialog.error.missingField", [field]))
      }
    }

    // Parse variables from JSON string if present
    let variables: VariableConfig[] | undefined
    if (row.variables && typeof row.variables === "string") {
      try {
        const parsed = JSON.parse(row.variables)
        if (Array.isArray(parsed)) {
          variables = parsed
        }
      } catch (error) {
        // Ignore parse errors for backwards compatibility
        console.warn("Failed to parse variables:", error)
      }
    }

    // Generate a new unique ID for the imported prompt
    const newId = generatePromptId()

    return {
      id: newId,
      name: String(row.name),
      content: String(row.content),
      executionCount: Number(row.executionCount) || 0,
      lastExecutedAt: new Date(row.lastExecutedAt),
      isPinned: Boolean(row.isPinned),
      lastExecutionUrl: String(row.lastExecutionUrl),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      variables,
    }
  }

  /**
   * Import prompts to storage using bulk save API
   */
  private async importPrompts(prompts: Prompt[]): Promise<ImportResult> {
    try {
      // Use the bulk save API for efficient import
      return await this.serviceFacade.saveBulkPrompts(prompts)
    } catch (error) {
      // If bulk save fails, return an error result
      throw new ImportError(prompts.length, [
        i18n.t("importDialog.error.bulkImportFailed", [error]),
      ])
    }
  }
}

/**
 * Singleton instance of import service
 */
export const promptImportService = new PromptImportService()
