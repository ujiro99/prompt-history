import { BaseAIService } from "../base/BaseAIService"
import { CHATGPT_CONFIG } from "./chatGptConfig"

export const supportHosts = ["chatgpt.com", "openai.com"]

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  constructor() {
    super(CHATGPT_CONFIG, supportHosts)
  }
}
