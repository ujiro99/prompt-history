/**
 * Definitions for Google Gemini
 */
export const GEMINI_DEFINITIONS = {
  selectors: {
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
      // Voice input button (if applicable)
      "speech-dictation-mic-button",
      // Fallbacks
      'button[type="submit"]',
      "button.send-button",
      "button:has(mat-icon)",
    ],
  },
  popupPlacement: {
    alignOffset: -40,
    sideOffset: 22,
  },
}
