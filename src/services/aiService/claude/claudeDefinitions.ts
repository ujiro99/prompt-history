/**
 * Definitions for Claude AI
 */
export const CLAUDE_DEFINITIONS = {
  selectors: {
    textInput: [
      'div[contenteditable="true"][aria-label]',
      'div[contenteditable="true"].ProseMirror',
    ],
    sendButton: ["button[type=button][aria-label][disabled]"],
  },
  popupPlacement: {
    alignOffset: -14,
    sideOffset: 22,
  },
}
