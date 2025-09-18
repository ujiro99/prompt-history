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
    ],
  },
  popupPlacement: {
    alignOffset: -10,
    sideOffset: 22,
  },
}
