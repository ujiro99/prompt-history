import { BaseAIService } from "../base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Skywork"
export const supportHosts = ["skywork.ai"]

/**
 * Skywork AI service implementation
 */
export class SkyworkService extends BaseAIService {
  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
