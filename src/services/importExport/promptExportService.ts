import Papa from "papaparse"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import type { ExportOptions } from "./types"
import type { Prompt } from "@/types/prompt"

/**
 * Service for exporting prompt data
 */
export class PromptExportService {
  private serviceFacade = PromptServiceFacade.getInstance()

  /**
   * Export prompts to CSV format
   */
  async exportToCSV(options: ExportOptions = {}): Promise<void> {
    try {
      // Get all prompts
      const allPrompts = await this.serviceFacade.getPrompts()

      // Filter prompts based on options
      let prompts = allPrompts
      if (options.pinnedOnly) {
        prompts = allPrompts.filter((prompt) => prompt.isPinned)
      }

      if (options.dateRange) {
        prompts = prompts.filter((prompt) => {
          const createdAt = new Date(prompt.createdAt)
          return (
            createdAt >= options.dateRange!.from &&
            createdAt <= options.dateRange!.to
          )
        })
      }

      // Convert to CSV format using Papa Parse
      const csvData = this.convertToCSV(prompts)

      // Download file
      this.downloadCSV(csvData, this.generateFileName())
    } catch (error) {
      throw new Error(`Export failed: ${error}`)
    }
  }

  /**
   * Convert prompts to CSV format using Papa Parse
   */
  private convertToCSV(prompts: Prompt[]): string {
    // Transform prompts to plain objects with proper field formatting (excluding id)
    const csvData = prompts.map((prompt) => ({
      name: prompt.name,
      content: prompt.content,
      executionCount: prompt.executionCount,
      lastExecutedAt: prompt.lastExecutedAt.toISOString(),
      isPinned: prompt.isPinned,
      lastExecutionUrl: prompt.lastExecutionUrl,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    }))

    // Use Papa Parse to generate CSV with headers and proper escaping
    return Papa.unparse(csvData, {
      header: true,
      quotes: true,
      delimiter: ",",
    })
  }

  /**
   * Generate filename with timestamp
   */
  private generateFileName(): string {
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, "-")
    return `prompts-export-${timestamp}.csv`
  }

  /**
   * Download CSV file
   */
  private downloadCSV(csvData: string, filename: string): void {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Singleton instance of export service
 */
export const promptExportService = new PromptExportService()
