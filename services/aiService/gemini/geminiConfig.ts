import type { AIServiceConfig } from "../base/types"
import { GEMINI_DEFINITIONS } from "./geminiDefinitions"
import { extractElementContent } from "../../dom"

export const supportHosts = ["gemini.google.com"]

/**
 * Configuration for Gemini service
 */
export const GEMINI_CONFIG: AIServiceConfig = {
  serviceName: "Gemini",

  selectors: GEMINI_DEFINITIONS.selectors,

  popupPlacement: GEMINI_DEFINITIONS.popupPlacement,

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
