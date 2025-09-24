import { BaseAIService } from "../base/BaseAIService"
import { CLAUDE_DEFINITIONS } from "./claudeDefinitions"

export const supportHosts = ["claude.ai"]

/**
 * Claude AI service implementation
 */
export class ClaudeService extends BaseAIService {
  constructor() {
    const config = {
      serviceName: "Claude",
      selectors: CLAUDE_DEFINITIONS.selectors,
      popupPlacement: CLAUDE_DEFINITIONS.popupPlacement,
      debounceTime: 100,
    }
    super(config, supportHosts)
  }
}
