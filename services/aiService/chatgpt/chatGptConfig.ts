import type { AIServiceConfig } from "../base/types"
import { CHATGPT_SELECTORS } from "./chatGptSelectors"
import { extractElementContent } from "../../dom"

/**
 * Configuration for ChatGPT service
 */
export const CHATGPT_CONFIG: AIServiceConfig = {
  serviceName: "ChatGPT",

  selectors: CHATGPT_SELECTORS,

  extractContent: extractElementContent,

  keyHandlers: {
    shouldTriggerSend: (event: KeyboardEvent): boolean => {
      // Send with Ctrl+Enter or Cmd+Enter, but not during IME composition
      return (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey) &&
        !event.isComposing
      )
    },
  },

  debounceTime: 100,

  isSupported: (hostname: string, _pathname: string): boolean => {
    return (
      hostname === "chatgpt.com" ||
      hostname === "chat.openai.com" ||
      hostname.endsWith(".openai.com") ||
      hostname === "ujiro99.github.io" // For testing
    )
  },
}
