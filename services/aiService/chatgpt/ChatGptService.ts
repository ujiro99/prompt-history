import { BaseAIService } from "../base/BaseAIService"
import { SelectorDebugger } from "../base/selectorDebugger"
import { CHATGPT_CONFIG } from "./chatGptConfig"
import { CHATGPT_DEFINITIONS } from "./chatGptDefinitions"

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  private debugger: SelectorDebugger

  constructor() {
    super(CHATGPT_CONFIG)
    this.debugger = new SelectorDebugger({
      serviceName: "ChatGPT",
      textInputSelectors: CHATGPT_DEFINITIONS.selectors.textInput,
      sendButtonSelectors: CHATGPT_DEFINITIONS.selectors.sendButton,
    })
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
