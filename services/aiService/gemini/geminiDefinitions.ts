/**
 * Definitions for Google Gemini
 */
export const GEMINI_DEFINITIONS = {
  selectors: {
    textInput: ['.ql-editor[contenteditable="true"]'],
    sendButton: [
      // Primary send button selectors
      "button.send-button",
      // Icon-based selectors
      'button mat-icon:has-text("send")',
      // Voice input button (if applicable)
      "speech-dictation-mic-button",
    ],
  },
  popupPlacement: {
    alignOffset: -40,
    sideOffset: 22,
  },
}
