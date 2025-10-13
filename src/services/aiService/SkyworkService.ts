import { BaseAIService } from "./base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Skywork"
const supportHosts: string[] = ["skywork.ai"]

/**
 * Skywork AI service implementation
 */
export class SkyworkService extends BaseAIService {
  static supportHosts = supportHosts

  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
