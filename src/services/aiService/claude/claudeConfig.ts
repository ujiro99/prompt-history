import type { AIServiceConfig } from "../base/types"
import { CLAUDE_DEFINITIONS } from "./claudeDefinitions"
import { extractElementContent } from "../../dom"

/**
 * Configuration for Claude AI service
 */
export const CLAUDE_CONFIG: AIServiceConfig = {
  serviceName: "Claude",

  selectors: CLAUDE_DEFINITIONS.selectors,

  popupPlacement: CLAUDE_DEFINITIONS.popupPlacement,

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
}
