import { BaseAIService } from "../base/BaseAIService"
import { PERPLEXITY_CONFIG } from "./perplexityConfig"

export const supportHosts = ["perplexity.ai", "www.perplexity.ai"]

/**
 * Perplexity AI service implementation
 */
export class PerplexityService extends BaseAIService {
  // Perplexity requires legacy mode for execCommand to insert text
  legacyMode = true

  constructor() {
    super(PERPLEXITY_CONFIG, supportHosts)
  }
}
