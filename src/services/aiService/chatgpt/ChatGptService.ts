import { BaseAIService } from "../base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "ChatGPT"
export const supportHosts = ["chatgpt.com", "openai.com"]

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
