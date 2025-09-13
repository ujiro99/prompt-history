import type { AIServiceConfig } from "../base/types"
import { GEMINI_SELECTORS } from "./geminiSelectors"

/**
 * Configuration for Gemini service
 */
export const GEMINI_CONFIG: AIServiceConfig = {
  serviceName: "Gemini",

  selectors: GEMINI_SELECTORS,

  extractContent: (element: Element): string => {
    // Handle contenteditable elements
    if (element.hasAttribute("contenteditable")) {
      return element.textContent || ""
    }

    // Handle rich-textarea or regular textarea
    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
    ) {
      return element.value
    }

    // For custom components, try to get text content
    return element.textContent || ""
  },

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

  supportedDomains: [
    "gemini.google.com",
    "bard.google.com",
    "aistudio.google.com",
  ],

  isSupported: (hostname: string, pathname: string): boolean => {
    return (
      hostname === "gemini.google.com" ||
      hostname === "bard.google.com" || // Old Bard domain
      hostname === "aistudio.google.com" ||
      (hostname.endsWith(".google.com") && pathname.includes("gemini")) ||
      hostname === "ujiro99.github.io"
    ) // For testing
  },
}
