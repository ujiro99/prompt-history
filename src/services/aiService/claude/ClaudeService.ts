import { BaseAIService } from "../base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Claude"

export const supportHosts = ["claude.ai"]

/**
 * Claude AI service implementation
 */
export class ClaudeService extends BaseAIService {
  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
