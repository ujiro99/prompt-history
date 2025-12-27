/**
 * Prompt History Fetcher
 * Fetches and formats prompt history for AI variable generation
 */

import { promptsStorage } from "@/services/storage/definitions"
import type { StoredPrompt } from "@/types/prompt"

/**
 * Fetch recent prompt history as concatenated text
 *
 * @param count - Number of recent prompts to fetch (default: 200)
 * @returns Concatenated prompt history text
 */
export async function fetchPromptHistory(count: number = 200): Promise<string> {
  // Get all prompts from storage
  const prompts = await promptsStorage.getValue()

  if (!prompts || Object.keys(prompts).length === 0) {
    return ""
  }

  // Convert to array and sort by last execution date (most recent first)
  const promptArray = Object.values(prompts).sort((a, b) => {
    const dateA = new Date(a.lastExecutedAt).getTime()
    const dateB = new Date(b.lastExecutedAt).getTime()
    return dateB - dateA // Descending order
  })

  // Take the most recent N prompts
  const recentPrompts = promptArray.slice(0, count)

  // Format prompts as text
  return formatPromptsAsText(recentPrompts)
}

/**
 * Format prompts as concatenated text
 * Each prompt is formatted with name and content
 *
 * @param prompts - Array of prompts to format
 * @returns Formatted text
 */
function formatPromptsAsText(prompts: StoredPrompt[]): string {
  if (prompts.length === 0) {
    return ""
  }

  return prompts
    .map((prompt) => {
      // Format:
      //   Name: {{prompt.name}}
      //   Content: {{prompt.content}}
      const nameSection = prompt.name ? `${prompt.name}:` : ""
      return `Name: ${nameSection}\nContent: ${prompt.content}`
    })
    .join("\n\n")
}

/**
 * Get statistics about prompt history
 *
 * @returns Object with prompt history statistics
 */
export async function getPromptHistoryStats(): Promise<{
  totalPrompts: number
  hasHistory: boolean
}> {
  const prompts = await promptsStorage.getValue()
  const totalPrompts = prompts ? Object.keys(prompts).length : 0

  return {
    totalPrompts,
    hasHistory: totalPrompts > 0,
  }
}
