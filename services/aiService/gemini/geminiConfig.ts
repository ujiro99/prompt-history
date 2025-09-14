import type { AIServiceConfig } from "../base/types"
import { GEMINI_SELECTORS } from "./geminiSelectors"
import { extractElementContent } from "../../dom"

/**
 * Configuration for Gemini service
 */
export const GEMINI_CONFIG: AIServiceConfig = {
  serviceName: "Gemini",

  selectors: GEMINI_SELECTORS,

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

  isSupported: (hostname: string, pathname: string): boolean => {
    return (
      hostname === "gemini.google.com" ||
      (hostname.endsWith(".google.com") && pathname.includes("gemini"))
    )
  },
}
