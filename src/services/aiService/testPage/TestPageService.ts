import { BaseAIService } from "../base/BaseAIService"
import { DEFINITIONS } from "./testPageDefinitions"

export const supportHosts: string[] = ["ujiro99.github.io"]

/**
 * TestPage service implementation
 */
export class TestPageService extends BaseAIService {
  constructor() {
    const config = {
      serviceName: "TestPage",
      selectors: DEFINITIONS.selectors,
      popupPlacement: DEFINITIONS.popupPlacement,
      debounceTime: 100,
    }

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
