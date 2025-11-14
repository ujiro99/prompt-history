import { improvePromptCacheStorage } from "./definitions"

/**
 * Improve Prompt Cache data structure
 */
export interface ImprovePromptCacheData {
  date: string // YYYY-MM-DD format
  instruction: string // System instruction text
  cachedAt: number // Unix timestamp
}

/**
 * Improve Prompt Cache service
 * Manages caching of system instruction for prompt improvement with date-based expiration
 */
export class ImprovePromptCacheService {
  /**
   * Get today's cached instruction if available
   * @returns Instruction string or null if no valid cache exists
   */
  async getTodaysCache(): Promise<string | null> {
    const cacheData = await improvePromptCacheStorage.getValue()

    if (!cacheData) {
      return null
    }

    if (this.isToday(cacheData.date)) {
      return cacheData.instruction
    }

    return null
  }

  /**
   * Save instruction to cache with today's date
   * @param instruction - System instruction to cache
   */
  async saveCache(instruction: string): Promise<void> {
    const cacheData: ImprovePromptCacheData = {
      date: this.getCurrentDateString(),
      instruction,
      cachedAt: Date.now(),
    }

    await improvePromptCacheStorage.setValue(cacheData)
  }

  /**
   * Get the latest cached instruction (fallback for fetch failures)
   * @returns Instruction string or null if no cache exists
   */
  async getLatestCache(): Promise<string | null> {
    const cacheData = await improvePromptCacheStorage.getValue()

    if (!cacheData) {
      return null
    }

    return cacheData.instruction
  }

  /**
   * Remove cached instruction
   */
  async clearCache(): Promise<void> {
    await improvePromptCacheStorage.removeValue()
  }

  /**
   * Get cache metadata for display
   * @returns Cache metadata or null if no cache exists
   */
  async getCacheMetadata(): Promise<{
    date: string
    cachedAt: number
  } | null> {
    const cacheData = await improvePromptCacheStorage.getValue()

    if (!cacheData) {
      return null
    }

    return {
      date: cacheData.date,
      cachedAt: cacheData.cachedAt,
    }
  }

  /**
   * Check if a date string represents today
   * @param dateString - Date in YYYY-MM-DD format
   * @returns true if the date is today, false otherwise
   */
  isToday(dateString: string): boolean {
    return dateString === this.getCurrentDateString()
  }

  /**
   * Get current date as YYYY-MM-DD string
   * @returns Current date string
   */
  getCurrentDateString(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }
}

// Export singleton instance
export const improvePromptCacheService = new ImprovePromptCacheService()
