import type { AIServiceConfig } from "../base/types"
import { CHATGPT_DEFINITIONS } from "./chatGptDefinitions"
import { extractElementContent } from "../../dom"

/**
 * Configuration for ChatGPT service
 */
export const CHATGPT_CONFIG: AIServiceConfig = {
  serviceName: "ChatGPT",

  selectors: CHATGPT_DEFINITIONS,

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
    return (
      hostname === "chatgpt.com" ||
      hostname === "chat.openai.com" ||
      hostname.endsWith(".openai.com") ||
      hostname === "ujiro99.github.io" // For testing
    )
  },
}
