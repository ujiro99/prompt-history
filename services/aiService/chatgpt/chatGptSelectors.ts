/**
 * DOM selector definitions for ChatGPT
 */
export const CHATGPT_SELECTORS = {
  textInput: [
    // New UI
    "#prompt-textarea",
    '[data-testid="prompt-textarea"]',
    // Old UI, fallback
    'textarea[placeholder*="Message"]',
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
    '[data-testid="composer-speech-button"]',
    // SVG icon based
    'button svg[data-icon="paper-plane"]',
    'button svg[data-icon="arrow-up"]',
    'button path[d*="M2.963"]', // Path of send icon
    // Fallbacks
    'form button[type="submit"]',
    "button:has(svg)",
    "button:last-child",
  ],
}
