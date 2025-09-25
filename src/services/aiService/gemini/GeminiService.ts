import { BaseAIService } from "../base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Gemini"
export const supportHosts = ["gemini.google.com"]

/**
 * Google Gemini AI service implementation
 */
export class GeminiService extends BaseAIService {
  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
