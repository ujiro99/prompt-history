import type { ServiceElementInfo } from "@/services/aiService/base/types"

/**
 * Debug interface methods for testing and debugging
 * Available as window.promptHistoryDebug in non-production environments
 */
export interface PromptHistoryDebugInterface {
  /**
   * Test all selectors for the current AI service
   */
  testSelectors(): void

  /**
   * Get information about currently detected elements
   */
  getElementInfo(): ServiceElementInfo | null

  /**
   * Get the name of the current AI service
   */
  getServiceName(): string | null

  /**
   * Extract the current prompt content from the text input
   */
  extractPromptContent(): string | null
}

declare global {
  interface Window {
    /**
     * Debug interface for prompt-history extension
     * Only available in non-production environments
     */
    promptHistoryDebug?: PromptHistoryDebugInterface
  }
}

export {}
