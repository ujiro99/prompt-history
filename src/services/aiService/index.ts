import type { AIServiceConfigData } from "@/services/aiService/base/types"

/**
 * AI Service exports
 */

import {
  TestPageService,
  supportHosts as testPageSupportHosts,
} from "./testPage/TestPageService"
import {
  ChatGptService,
  supportHosts as chatGptSupportHosts,
} from "./chatgpt/ChatGptService"
import {
  GeminiService,
  supportHosts as geminiSupporHosts,
} from "./gemini/GeminiService"
import {
  PerplexityService,
  supportHosts as perplexitySupportHosts,
} from "./perplexity/PerplexityService"
import {
  ClaudeService,
  supportHosts as claudeSupportHosts,
} from "./claude/ClaudeService"
import { StorageService } from "../storage"

export const supportHosts = [
  ...testPageSupportHosts,
  ...chatGptSupportHosts,
  ...geminiSupporHosts,
  ...perplexitySupportHosts,
  ...claudeSupportHosts,
]

const createServices = (configs: Record<string, AIServiceConfigData>) => {
  return [
    new TestPageService(configs),
    new ChatGptService(configs),
    new GeminiService(configs),
    new PerplexityService(configs),
    new ClaudeService(configs),
  ]
}

export const getAiServices = async () => {
  const storage = StorageService.getInstance()

  // 1. Check for today's cache first
  const todaysCache = await storage.getTodaysAiConfigCache()
  if (todaysCache) {
    console.debug("Using cached AI service configs:", todaysCache)
    return createServices(todaysCache)
  }

  // 2. Cache not available, fetch from external endpoint
  try {
    const configs = await fetch(import.meta.env.WXT_CONFIG_ENDPOINT).then(
      (res) => res.json(),
    )
    console.debug("Fetched AI service configs:", configs)

    // 3. Save successful fetch to cache
    await storage.saveAiConfigCache(configs)

    return createServices(configs)
  } catch (error) {
    console.error("Failed to fetch AI service configs:", error)

    // 4. Fetch failed, try to use fallback cache
    const fallbackCache = await storage.getLatestAiConfigCache()
    if (fallbackCache) {
      console.warn("Using fallback AI service configs:", fallbackCache)
      return createServices(fallbackCache)
    }

    throw new Error("No AI service configs available")
  }
}
