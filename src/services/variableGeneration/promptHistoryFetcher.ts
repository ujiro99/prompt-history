/**
 * Prompt History Fetcher
 * Fetches and formats prompt history for AI variable generation
 */

import { promptsStorage } from "@/services/storage/definitions"
import { getPromptHistoryCount } from "./metaPromptGenerator"
import type { StoredPrompt } from "@/types/prompt"

/**
 * Fetch recent prompt history as concatenated text
 *
 * @param count - Number of recent prompts to fetch (default: 200)
 * @returns Concatenated prompt history text
 */
export async function fetchPromptHistory(): Promise<string> {
  const count = await getPromptHistoryCount()
  const result = await fetchPromptHistoryWithCount(count)
  return result.promptHistory
}

/**
 * Fetch recent prompt history with count
 *
 * @param count - Number of recent prompts to fetch (default: 200)
 * @returns Object containing prompt history text and actual count
 */
export async function fetchPromptHistoryWithCount(
  count: number = 200,
): Promise<{
  promptHistory: string
  promptCount: number
}> {
  // Get all prompts from storage
  const prompts = await promptsStorage.getValue()

  if (!prompts || Object.keys(prompts).length === 0) {
    return {
      promptHistory: "",
      promptCount: 0,
    }
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
  return {
    promptHistory: formatPromptsAsText(recentPrompts),
    promptCount: recentPrompts.length,
  }
}

/**
 * Truncate string to max length
 *
 * @param str - Input string
 * @param maxLength - Maximum length (default: 1000)
 * @returns Truncated string
 */
function truncate(str: string, maxLength = 1000): string {
  return str.length > maxLength ? str.slice(0, maxLength) : str
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
      return `Name: ${nameSection}\nContent: ${truncate(prompt.content)}`
    })
    .join("\n\n")
}
