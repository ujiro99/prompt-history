import { BaseAIService } from "../base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Gemini"
const supportHosts: string[] = ["gemini.google.com"]

/**
 * Google Gemini AI service implementation
 */
export class GeminiService extends BaseAIService {
  static supportHosts = supportHosts

  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
