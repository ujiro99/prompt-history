import { BaseAIService } from "../base/BaseAIService"
import { CHATGPT_DEFINITIONS } from "./chatGptDefinitions"

export const supportHosts = ["chatgpt.com", "openai.com"]

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  constructor() {
    const config = {
      serviceName: "ChatGPT",
      selectors: CHATGPT_DEFINITIONS.selectors,
      popupPlacement: CHATGPT_DEFINITIONS.popupPlacement,
      debounceTime: 100,
    }

    super(config, supportHosts)
  }
}
