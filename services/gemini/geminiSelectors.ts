import type { GeminiSelectors } from "../../types/prompt"

/**
 * DOM selector definitions for Google Gemini
 */
export const GEMINI_SELECTORS: GeminiSelectors = {
  textInput: [
    // Primary selectors for Gemini input
    '.ql-editor[contenteditable="true"]',
    // Generic fallbacks
    '[contenteditable="true"]',
    '[role="textbox"]',
    "div.input-area",
    "textarea",
  ],
  sendButton: [
    // Primary send button selectors
    "button.send-button",
    // Icon-based selectors
    'button mat-icon:has-text("send")',
    // Fallbacks
    'button[type="submit"]',
    "button.send-button",
    "button:has(mat-icon)",
  ],
  chatHistory: [
    // Conversation elements
    ".conversation-turn",
    ".message-content",
    '[data-test-id="conversation-turn"]',
    ".model-response-text",
    ".user-query-text",
    "message-content",
    '[role="presentation"]',
  ],
}
