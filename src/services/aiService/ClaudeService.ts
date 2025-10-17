import { BaseAIService } from "./base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Claude"
const supportHosts: string[] = ["claude.ai"]

/**
 * Claude AI service implementation
 */
export class ClaudeService extends BaseAIService {
  static supportHosts = supportHosts

  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
