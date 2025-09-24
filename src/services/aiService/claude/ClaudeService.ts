import { BaseAIService } from "../base/BaseAIService"
import { CLAUDE_CONFIG } from "./claudeConfig"

/**
 * Claude AI service implementation
 */
export class ClaudeService extends BaseAIService {
  constructor() {
    super(CLAUDE_CONFIG)
  }
}
