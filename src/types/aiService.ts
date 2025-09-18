// Type definitions for AI service functionality

/**
 * AI service abstraction interface
 */
export interface AIServiceInterface {
  /** Check if this service is supported */
  isSupported(): boolean
  /** Get text input element */
  getTextInput(): Element | null
  /** Get send button element */
  getSendButton(): Element | null
  /** Extract current prompt content */
  extractPromptContent(): string
  /** Set up send event monitoring */
  onSend(callback: () => void): () => void
  /** Set up content change monitoring */
  onContentChange(callback: (content: string) => void): () => void
  /** Set up Input element change monitoring */
  onElementChange(callback: (element: Element | null) => void): () => void
  /** Get service name */
  getServiceName(): string
  /** Get popup placement details */
  getPopupPlacement(): PopupPlacement
  /** Service cleanup */
  destroy(): void
  /** Legacy mode flag */
  legacyMode: boolean
}

export interface PopupPlacement {
  alignOffset: number
  sideOffset: number
}
