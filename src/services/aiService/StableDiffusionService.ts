import { BaseAIService } from "./base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "Stable Diffusion"
const supportHosts: string[] = ["stablediffusionweb.com"]

/**
 * Stable Diffusion AI service implementation
 */
export class StableDiffusionService extends BaseAIService {
  static supportHosts = supportHosts

  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }
}
