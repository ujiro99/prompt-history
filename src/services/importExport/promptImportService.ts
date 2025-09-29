import Papa from "papaparse"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import type { ImportResult } from "./types"
import type { Prompt } from "@/types/prompt"
import { generatePromptId } from "@/utils/idGenerator"

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
}

/**
 * Service for importing prompt data
 */
export class PromptImportService {
  private serviceFacade = PromptServiceFacade.getInstance()

  /**
   * Import prompts from CSV file
   */
  async importFromCSV(): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".csv"
      input.style.display = "none"

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error("No file selected"))
          return
        }

        try {
          const result = await this.processCSVFile(file)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      document.body.appendChild(input)
      input.click()
      document.body.removeChild(input)
    })
  }

  /**
   * Process CSV file and import prompts
   */
  private async processCSVFile(file: File): Promise<ImportResult> {
    const csvText = await this.readFileAsText(file)
    const prompts = this.parseCSV(csvText)

    return await this.importPrompts(prompts)
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
        reject(new Error("Failed to read file"))
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
      console.warn("CSV parsing warnings:", parseResult.errors)
    }

    const prompts: Prompt[] = []

    for (let i = 0; i < parseResult.data.length; i++) {
      try {
        const prompt = this.parseRowData(parseResult.data[i])
        prompts.push(prompt)
      } catch (error) {
        console.warn(`Failed to parse row ${i + 2}:`, error)
        // Continue with other rows
      }
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
        throw new Error(`Missing required field: ${field}`)
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
      return {
        imported: 0,
        duplicates: 0,
        errors: prompts.length,
        errorMessages: [`Bulk import failed: ${error}`],
      }
    }
  }
}

/**
 * Singleton instance of import service
 */
export const promptImportService = new PromptImportService()
