import Papa from "papaparse"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import type { ImportResult, PromptCSVRow } from "./types"
import type { Prompt, VariableConfig } from "@/types/prompt"
import type { AIGeneratedMetadata } from "@/types/promptOrganizer"
import { generatePromptId } from "@/utils/idGenerator"
import { ImportError } from "./ImportError"
import { i18n } from "#imports"

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
    const parseResult = Papa.parse<PromptCSVRow>(csvText, {
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
   * Parse aiMetadata from JSON string with validation
   */
  private parseAIMetadata(jsonString: string): AIGeneratedMetadata | undefined {
    try {
      const parsed = JSON.parse(jsonString)

      // Validate structure
      if (typeof parsed !== "object" || parsed === null) {
        console.warn("Invalid aiMetadata: not an object")
        return undefined
      }

      // Validate required fields exist
      const requiredFields = [
        "sourcePromptIds",
        "sourceCount",
        "confirmed",
        "showInPinned",
      ]
      for (const field of requiredFields) {
        if (!(field in parsed)) {
          console.warn(`Invalid aiMetadata: missing field "${field}"`)
          return undefined
        }
      }

      // Validate field types
      if (!Array.isArray(parsed.sourcePromptIds)) {
        console.warn("Invalid aiMetadata: sourcePromptIds is not an array")
        return undefined
      }

      // Validate all elements in sourcePromptIds are strings
      if (
        !parsed.sourcePromptIds.every((id: unknown) => typeof id === "string")
      ) {
        console.warn(
          "Invalid aiMetadata: sourcePromptIds contains non-string values",
        )
        return undefined
      }

      if (typeof parsed.sourceCount !== "number" || parsed.sourceCount < 0) {
        console.warn(
          "Invalid aiMetadata: sourceCount is not a non-negative number",
        )
        return undefined
      }

      if (typeof parsed.confirmed !== "boolean") {
        console.warn("Invalid aiMetadata: confirmed is not a boolean")
        return undefined
      }

      if (typeof parsed.showInPinned !== "boolean") {
        console.warn("Invalid aiMetadata: showInPinned is not a boolean")
        return undefined
      }

      return parsed as AIGeneratedMetadata
    } catch (error) {
      console.warn("Failed to parse aiMetadata JSON:", error)
      return undefined
    }
  }

  /**
   * Parse Papa Parse row data to prompt object
   * Note: Uses Record type because Papa Parse may not fully convert types despite dynamicTyping option
   */
  private parseRowData(row: PromptCSVRow): Prompt {
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

    // Parse aiMetadata from JSON string if present
    let aiMetadata: AIGeneratedMetadata | undefined
    if (row.aiMetadata && typeof row.aiMetadata === "string") {
      aiMetadata = this.parseAIMetadata(row.aiMetadata)
    }

    // Parse isAIGenerated
    let isAIGenerated: boolean | undefined = undefined
    if (row.isAIGenerated !== undefined && row.isAIGenerated !== "") {
      // Handle string "true"/"false", boolean, and numeric values
      const value = String(row.isAIGenerated).toLowerCase()
      if (value === "true" || value === "1") {
        isAIGenerated = true
      }
      // For false/0/"false", keep as undefined
    }

    // Parse categoryId and useCase
    const categoryId = row.categoryId || undefined
    const useCase = row.useCase || undefined

    // Parse excludeFromOrganizer
    const excludeFromOrganizer =
      row.excludeFromOrganizer !== undefined
        ? Boolean(row.excludeFromOrganizer)
        : undefined

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
      isAIGenerated,
      aiMetadata,
      categoryId,
      useCase,
      excludeFromOrganizer,
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
