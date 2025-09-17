/**
 * Definitions for ChatGPT
 */
export const CHATGPT_DEFINITIONS = {
  selectors: {
    textInput: [
      "#prompt-textarea",
      '[data-testid="prompt-textarea"]',
      // openai.com
      "#main form textarea",
      // test page
      'div[contenteditable="true"].ql-editor',
    ],
    sendButton: [
      '[data-testid="send-button"]',
      '[data-testid="composer-speech-button"]',
      '[id="composer-submit-button"]',
      // openai.com
      "button[type='submit']",
      // SVG icon based
      'button svg[data-icon="paper-plane"]',
      'button svg[data-icon="arrow-up"]',
      'button path[d*="M2.963"]', // Path of send icon
      // Fallbacks
      'form button[type="submit"]',
      "button:has(svg)",
      "button:last-child",
    ],
  },
  popupPlacement: {
    alignOffset: -10,
    sideOffset: 22,
  },
}
