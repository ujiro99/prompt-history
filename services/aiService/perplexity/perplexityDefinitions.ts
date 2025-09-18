/**
 * Definitions for Perplexity AI
 */
export const PERPLEXITY_DEFINITIONS = {
  selectors: {
    textInput: ["div#ask-input"],
    sendButton: [
      'button[data-testid="submit-button"]',
      'button[type="button"]:has(svg.tabler-icon)',
    ],
  },
  popupPlacement: {
    alignOffset: -6,
    sideOffset: 20,
  },
}
