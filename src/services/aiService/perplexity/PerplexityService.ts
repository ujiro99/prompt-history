import { BaseAIService } from "../base/BaseAIService"
import { PERPLEXITY_DEFINITIONS } from "./perplexityDefinitions"

export const supportHosts = ["perplexity.ai", "www.perplexity.ai"]

/**
 * Perplexity AI service implementation
 */
export class PerplexityService extends BaseAIService {
  // Perplexity requires legacy mode for execCommand to insert text
  legacyMode = true

  constructor() {
    const config = {
      serviceName: "Perplexity",
      selectors: PERPLEXITY_DEFINITIONS.selectors,
      popupPlacement: PERPLEXITY_DEFINITIONS.popupPlacement,
      debounceTime: 100,
    }
    super(config, supportHosts)
  }
}
