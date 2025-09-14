import { BaseAIService } from "../base/BaseAIService"
import { SelectorDebugger } from "../base/selectorDebugger"
import { GEMINI_CONFIG } from "./geminiConfig"
import { GEMINI_DEFINITIONS } from "./geminiDefinitions"

/**
 * Google Gemini AI service implementation
 */
export class GeminiService extends BaseAIService {
  private debugger: SelectorDebugger

  constructor() {
    super(GEMINI_CONFIG)
    this.debugger = new SelectorDebugger({
      serviceName: "Gemini",
      textInputSelectors: GEMINI_DEFINITIONS.selectors.textInput,
      sendButtonSelectors: GEMINI_DEFINITIONS.selectors.sendButton,
    })
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
