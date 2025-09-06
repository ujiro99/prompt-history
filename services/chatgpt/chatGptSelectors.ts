import type { ChatGPTSelectors } from "../../types/prompt"

/**
 * DOM selector definitions for ChatGPT
 */
export const CHATGPT_SELECTORS: ChatGPTSelectors = {
  textInput: [
    // New UI
    "#prompt-textarea",
    '[data-testid="prompt-textarea"]',
    // Old UI, fallback
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="メッセージ"]',
    'div[contenteditable="true"][data-id*="prompt"]',
    'div[contenteditable="true"]',
    // Additional fallbacks
    "textarea",
    '[role="textbox"]',
  ],
  sendButton: [
    // New UI
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="送信"]',
    // SVG icon based
    'button svg[data-icon="paper-plane"]',
    'button svg[data-icon="arrow-up"]',
    'button path[d*="M2.963"]', // Path of send icon
    // Fallbacks
    'form button[type="submit"]',
    "button:has(svg)",
    "button:last-child",
  ],
  chatHistory: [
    '[data-testid="conversation-turn"]',
    ".conversation-turn",
    "[data-message-author-role]",
    ".group.w-full",
    '[role="presentation"]',
  ],
}
