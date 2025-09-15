/**
 * Definitions for Perplexity AI
 */
export const PERPLEXITY_DEFINITIONS = {
  selectors: {
    textInput: [
      // Main textarea for Perplexity
      'textarea[placeholder*="Ask anything"]',
      'textarea[placeholder*="Ask follow-up"]',
      // Generic textarea selectors
      'textarea[data-testid="textbox"]',
      'div[contenteditable="true"][role="textbox"]',
      // Fallback selectors
      "textarea",
      '[role="textbox"]',
      'input[type="text"]',
    ],
    sendButton: [
      // Send button selectors for Perplexity
      'button[aria-label*="Submit"]',
      'button[aria-label*="Send"]',
      'button[data-testid="submit-button"]',
      'button[type="submit"]',
      // SVG icon based
      'button svg[data-icon="arrow-up"]',
      'button svg[data-icon="send"]',
      'button:has(svg[viewBox*="24"])',
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
