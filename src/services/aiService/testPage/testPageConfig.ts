import type { AIServiceConfig } from "../base/types"
import { DEFINITIONS } from "./testPageDefinitions"
import { extractElementContent } from "../../dom"

export const supportHosts = [
  "ujiro99.github.io", // For testing
]

/**
 * Configuration for TestPage service
 */
export const TESTPAGE_CONFIG: AIServiceConfig = {
  serviceName: "TestPage",
  selectors: DEFINITIONS.selectors,
  popupPlacement: DEFINITIONS.popupPlacement,
  extractContent: extractElementContent,

  keyHandlers: {
    shouldTriggerSend: (event: KeyboardEvent): boolean => {
      // Send with Enter (but not Shift+Enter or Ctrl+Enter), and not during IME composition
      return (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.isComposing
      )
    },
  },

  debounceTime: 100,

  isSupported: (hostname: string, _pathname: string): boolean => {
    return supportHosts.includes(hostname)
  },
}
