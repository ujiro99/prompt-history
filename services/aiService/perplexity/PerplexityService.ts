import { BaseAIService } from "../base/BaseAIService"
import { SelectorDebugger } from "../base/selectorDebugger"
import { PERPLEXITY_CONFIG } from "./perplexityConfig"
import { PERPLEXITY_DEFINITIONS } from "./perplexityDefinitions"

/**
 * Perplexity AI service implementation
 */
export class PerplexityService extends BaseAIService {
  private debugger: SelectorDebugger

  // Perplexity requires legacy mode for execCommand to insert text
  legacyMode = true

  constructor() {
    super(PERPLEXITY_CONFIG)
    this.debugger = new SelectorDebugger({
      serviceName: "Perplexity",
      textInputSelectors: PERPLEXITY_DEFINITIONS.selectors.textInput,
      sendButtonSelectors: PERPLEXITY_DEFINITIONS.selectors.sendButton,
    })
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
