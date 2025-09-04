import type { ChatGPTSelectors } from "../../types/prompt"

/**
 * ChatGPT用のDOMセレクタ定義
 */
export const CHATGPT_SELECTORS: ChatGPTSelectors = {
  textInput: [
    // 新しいUI
    "#prompt-textarea",
    '[data-testid="prompt-textarea"]',
    // 旧UI、フォールバック
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="メッセージ"]',
    'div[contenteditable="true"][data-id*="prompt"]',
    'div[contenteditable="true"]',
    // 更なるフォールバック
    "textarea",
    '[role="textbox"]',
  ],
  sendButton: [
    // 新しいUI
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="送信"]',
    // SVGアイコンベース
    'button svg[data-icon="paper-plane"]',
    'button svg[data-icon="arrow-up"]',
    'button path[d*="M2.963"]', // 送信アイコンのパス
    // フォールバック
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
