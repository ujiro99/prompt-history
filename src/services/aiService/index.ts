import type { AIServiceConfigData } from "@/services/aiService/base/types"

/**
 * AI Service exports
 */

import { TestPageService } from "./TestPageService"
import { ChatGptService } from "./ChatGptService"
import { GeminiService } from "./GeminiService"
import { PerplexityService } from "./PerplexityService"
import { ClaudeService } from "./ClaudeService"
import { SkyworkService } from "./SkyworkService"
import { StableDiffusionService } from "./StableDiffusionService"
import { StorageService } from "../storage"

export const Services = [
  TestPageService,
  ChatGptService,
  GeminiService,
  PerplexityService,
  ClaudeService,
  SkyworkService,
  StableDiffusionService,
]

export const supportHosts = Services.flatMap((service) => service.supportHosts)

const createServices = (configs: Record<string, AIServiceConfigData>) => {
  return Services.map((service) => new service(configs))
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
