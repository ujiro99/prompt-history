import { BaseAIService } from "../base/BaseAIService"
import { CHATGPT_CONFIG } from "./chatGptConfig"

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  constructor() {
    super(CHATGPT_CONFIG)
  }
}
