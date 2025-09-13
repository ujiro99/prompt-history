import { BaseAIService } from "../base/BaseAIService"
import { ChatGptDomManager } from "./ChatGptDomManager"
import { ChatGptDebugger } from "./ChatGptDebugger"
import { CHATGPT_CONFIG } from "./chatGptConfig"

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  private debugger: ChatGptDebugger

  constructor() {
    super(new ChatGptDomManager(), CHATGPT_CONFIG)
    this.debugger = new ChatGptDebugger()
  }

  /**
   * Run selector tests
   */
  testSelectors(): void {
    this.debugger.testSelectors()
  }
}
