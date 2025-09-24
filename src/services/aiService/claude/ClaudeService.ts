import { BaseAIService } from "../base/BaseAIService"
import { CLAUDE_CONFIG } from "./claudeConfig"

export const supportHosts = ["claude.ai"]

/**
 * Claude AI service implementation
 */
export class ClaudeService extends BaseAIService {
  constructor() {
    super(CLAUDE_CONFIG, supportHosts)
  }
}
