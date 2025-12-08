/**
 * Prompt Filter Service
 * Filters prompts based on criteria for organization
 */

import type { Prompt } from "@/types/prompt"
import type {
  PromptForOrganization,
  PromptOrganizerSettings,
} from "@/types/promptOrganizer"

/**
 * Service for filtering prompts for organization
 */
export class PromptFilterService {
  /**
   * Filter prompts based on settings
   * @param prompts - All prompts
   * @param settings - Filter settings
   * @returns Filtered prompts for organization
   */
  public filterPrompts(
    prompts: Prompt[],
    settings: PromptOrganizerSettings,
  ): PromptForOrganization[] {
    const now = new Date()
    const periodMs = settings.filterPeriodDays * 24 * 60 * 60 * 1000

    // Filter by period and execution count
    const filtered = prompts
      .filter((p) => {
        // Exclude prompts marked as excluded from organizer
        if (p.excludeFromOrganizer) return false

        // Check period
        const timeDiff = now.getTime() - p.lastExecutedAt.getTime()
        if (timeDiff > periodMs) return false

        // Check execution count
        if (p.executionCount < settings.filterMinExecutionCount) return false

        return true
      })
      // Sort by execution count (descending)
      .sort((a, b) => b.executionCount - a.executionCount)
      // Limit to max prompts
      .slice(0, settings.filterMaxPrompts)
      // Convert to PromptForOrganization
      .map((p) => ({
        id: p.id,
        name: p.name,
        content: p.content,
        executionCount: p.executionCount,
      }))

    return filtered
  }

  /**
   * Get count of prompts that would be filtered
   * @param prompts - All prompts
   * @param settings - Filter settings
   * @returns Count of filtered prompts
   */
  public getFilteredCount(
    prompts: Prompt[],
    settings: PromptOrganizerSettings,
  ): number {
    return this.filterPrompts(prompts, settings).length
  }
}

export const promptFilterService = new PromptFilterService()
