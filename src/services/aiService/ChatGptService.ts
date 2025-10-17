import { BaseAIService } from "./base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "ChatGPT"
const supportHosts: string[] = ["chatgpt.com", "openai.com"]

/**
 * ChatGPT AI service implementation
 */
export class ChatGptService extends BaseAIService {
  static supportHosts = supportHosts

  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
