import { BaseAIService } from "@/services/aiService/base/BaseAIService"
import type { AIServiceConfigData } from "@/services/aiService/base/types"

const ServiceName = "TestPage"
export const supportHosts: string[] = ["ujiro99.github.io"]

/**
 * TestPage service implementation
 */
export class TestPageService extends BaseAIService {
  constructor(configs: Record<string, AIServiceConfigData> = {}) {
    const config = configs[ServiceName] || {}
    super(config, supportHosts)
  }

  shouldTriggerSend(event: KeyboardEvent): boolean {
    // Send with Enter (but not Shift+Enter or Ctrl+Enter), and not during IME composition
    return (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.isComposing
    )
  }
}
