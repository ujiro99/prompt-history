import { BaseAIService } from "../base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Perplexity"
const supportHosts: string[] = ["perplexity.ai", "www.perplexity.ai"]

/**
 * Perplexity AI service implementation
 */
export class PerplexityService extends BaseAIService {
  static supportHosts = supportHosts

  // Perplexity requires legacy mode for execCommand to insert text
  legacyMode = true

  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
