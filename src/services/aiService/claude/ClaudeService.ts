import { BaseAIService } from "../base/BaseAIService"
import { SelectorDebugger } from "../base/selectorDebugger"
import { CLAUDE_CONFIG } from "./claudeConfig"
import { CLAUDE_DEFINITIONS } from "./claudeDefinitions"

/**
 * Claude AI service implementation
 */
export class ClaudeService extends BaseAIService {
  private debugger: SelectorDebugger

  // Claude requires legacy mode for execCommand to insert text
  legacyMode = true

  constructor() {
    super(CLAUDE_CONFIG)
    this.debugger = new SelectorDebugger({
      serviceName: "Claude",
      textInputSelectors: CLAUDE_DEFINITIONS.selectors.textInput,
      sendButtonSelectors: CLAUDE_DEFINITIONS.selectors.sendButton,
    })
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}