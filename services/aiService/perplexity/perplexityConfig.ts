import type { AIServiceConfig } from "../base/types"
import { PERPLEXITY_DEFINITIONS } from "./perplexityDefinitions"
import { extractElementContent } from "../../dom"

export const supportHosts = ["perplexity.ai", "www.perplexity.ai"]

/**
 * Configuration for Perplexity AI service
 */
export const PERPLEXITY_CONFIG: AIServiceConfig = {
  serviceName: "Perplexity",

  selectors: PERPLEXITY_DEFINITIONS.selectors,

  popupPlacement: PERPLEXITY_DEFINITIONS.popupPlacement,

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
