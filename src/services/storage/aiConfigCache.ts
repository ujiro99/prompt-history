import type { AIServiceConfigData } from "@/services/aiService/base/types"
import { aiConfigCacheStorage } from "./definitions"

/**
 * AI Config Cache data structure
 */
export interface AiConfigCacheData {
  date: string // YYYY-MM-DD format
  configs: Record<string, AIServiceConfigData> // AI service configurations
  cachedAt: number // Unix timestamp
}

/**
 * AI Config Cache service
 * Manages caching of AI service configurations with date-based expiration
 */
export class AiConfigCacheService {
  /**
   * Get today's cached configs if available
   * @returns Configs object or null if no valid cache exists
   */
  async getTodaysCache(): Promise<Record<string, AIServiceConfigData> | null> {
    const cacheData = await aiConfigCacheStorage.getValue()

    if (!cacheData) {
      return null
    }

    if (this.isToday(cacheData.date)) {
      return cacheData.configs
    }

    return null
  }

  /**
   * Save configs to cache with today's date
   * @param configs - AI service configurations to cache
   */
  async saveCache(configs: Record<string, AIServiceConfigData>): Promise<void> {
    const cacheData: AiConfigCacheData = {
      date: this.getCurrentDateString(),
      configs,
      cachedAt: Date.now(),
    }

    await aiConfigCacheStorage.setValue(cacheData)
  }

  /**
   * Get the latest cached configs (fallback for fetch failures)
   * @returns Configs object or null if no cache exists
   */
  async getLatestCache(): Promise<Record<string, AIServiceConfigData> | null> {
    const cacheData = await aiConfigCacheStorage.getValue()

    if (!cacheData) {
      return null
    }

    return cacheData.configs
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
export const aiConfigCacheService = new AiConfigCacheService()
