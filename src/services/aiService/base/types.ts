import { PopupPlacement } from "@/types/aiService"

/**
 * Configuration interface for AI service implementations
 */
export interface AIServiceConfig {
  /** Service display name */
  serviceName: string

  /** DOM selectors for finding elements */
  selectors: {
    /** Possible selectors for the text input element */
    textInput: string[]
    /** Possible selectors for the send button element */
    sendButton: string[]
  }

  /** InputPopup placement details */
  popupPlacement: PopupPlacement

  /** Function to extract content from text input element */
  extractContent: (element: Element) => string

  /** Keyboard event handlers */
  keyHandlers: {
    shouldTriggerSend: (event: KeyboardEvent) => boolean
  }

  /** Debounce time for content change events (ms) */
  debounceTime: number

  /** Domain checker function */
  isSupported: (hostname: string, pathname: string) => boolean
}

/**
 * Interface for DOM element information (debugging)
 */
export interface ElementInfo {
  found: boolean
  selector?: string
  tagName?: string
  element?: Element | null
}

/**
 * Debug information about detected elements
 */
export interface ServiceElementInfo {
  textInput: ElementInfo
  sendButton: ElementInfo
}

/**
 * Callback types for DOM manager events
 */
export type SendCallback = () => void
export type ContentChangeCallback = (content: string) => void
export type ElementChangeCallback = (element: Element | null) => void
