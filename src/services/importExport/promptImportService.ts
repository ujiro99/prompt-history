import { PromptServiceFacade } from "@/services/promptServiceFacade"
import type { ImportResult } from "./types"
import type { Prompt, SaveDialogData } from "@/types/prompt"
import { SaveMode } from "@/types/prompt"

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
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.csv'
      input.style.display = 'none'

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error('No file selected'))
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
        reject(new Error('Failed to read file'))
      }
      reader.readAsText(file)
    })
  }

  /**
   * Parse CSV text to prompt objects
   */
  private parseCSV(csvText: string): Prompt[] {
    const lines = csvText.split('\\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('Invalid CSV format: no data rows found')
    }

    // Skip header row
    const dataLines = lines.slice(1)
    const prompts: Prompt[] = []

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const prompt = this.parseCSVRow(dataLines[i])
        prompts.push(prompt)
      } catch (error) {
        console.warn(`Failed to parse row ${i + 2}:`, error)
        // Continue with other rows
      }
    }

    return prompts
  }

  /**
   * Parse single CSV row to prompt object
   */
  private parseCSVRow(row: string): Prompt {
    const fields = this.parseCSVFields(row)

    if (fields.length < 9) {
      throw new Error('Invalid CSV row: insufficient fields')
    }

    return {
      id: fields[0],
      name: fields[1],
      content: fields[2],
      executionCount: parseInt(fields[3]) || 0,
      lastExecutedAt: new Date(fields[4]),
      isPinned: fields[5].toLowerCase() === 'true',
      lastExecutionUrl: fields[6],
      createdAt: new Date(fields[7]),
      updatedAt: new Date(fields[8]),
    }
  }

  /**
   * Parse CSV fields handling quotes and commas
   */
  private parseCSVFields(row: string): string[] {
    const fields: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0

    while (i < row.length) {
      const char = row[i]

      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField)
        currentField = ''
        i++
      } else {
        currentField += char
        i++
      }
    }

    // Add the last field
    fields.push(currentField)

    return fields
  }

  /**
   * Import prompts to storage
   */
  private async importPrompts(prompts: Prompt[]): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      duplicates: 0,
      errors: 0,
      errorMessages: [],
    }

    // Get existing prompts to check for duplicates
    const existingPrompts = await this.serviceFacade.getPrompts()
    const existingIds = new Set(existingPrompts.map(p => p.id))

    for (const prompt of prompts) {
      try {
        if (existingIds.has(prompt.id)) {
          result.duplicates++
          continue
        }

        // Convert to SaveDialogData for saving
        const saveData: SaveDialogData = {
          name: prompt.name,
          content: prompt.content,
          saveMode: SaveMode.New,
          isPinned: prompt.isPinned,
        }

        await this.serviceFacade.savePromptManually(saveData)
        result.imported++
      } catch (error) {
        result.errors++
        result.errorMessages.push(`Failed to import prompt "${prompt.name}": ${error}`)
      }
    }

    return result
  }
}

/**
 * Singleton instance of import service
 */
export const promptImportService = new PromptImportService()