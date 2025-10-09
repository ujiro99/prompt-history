import { PromptServiceFacade } from "../promptServiceFacade"
import type { ServiceElementInfo } from "../aiService/base/types"

/**
 * Debug interface for testing and debugging prompt-history extension
 * Only available in non-production environments
 */
export class DebugInterface {
  private static instance: DebugInterface | null = null

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DebugInterface {
    if (!DebugInterface.instance) {
      DebugInterface.instance = new DebugInterface()
    }
    return DebugInterface.instance
  }

  /**
   * Get the PromptServiceFacade instance
   */
  private getService(): PromptServiceFacade {
    return PromptServiceFacade.getInstance()
  }

  /**
   * Test all selectors for the current AI service
   */
  testSelectors(): void {
    const service = this.getService()
    const aiService = service.getAIService()

    if (!aiService) {
      console.warn("⚠️ AI service not initialized yet")
      return
    }

    aiService.testSelectors()
  }

  /**
   * Get information about currently detected elements
   */
  getElementInfo(): ServiceElementInfo | null {
    const service = this.getService()
    const aiService = service.getAIService()

    if (!aiService) {
      console.warn("⚠️ AI service not initialized yet")
      return null
    }

    return aiService.getElementInfo()
  }

  /**
   * Get the name of the current AI service
   */
  getServiceName(): string | null {
    const service = this.getService()
    const aiService = service.getAIService()

    if (!aiService) {
      console.warn("⚠️ AI service not initialized yet")
      return null
    }

    return aiService.getServiceName()
  }

  /**
   * Extract the current prompt content from the text input
   */
  extractPromptContent(): string | null {
    const service = this.getService()
    const aiService = service.getAIService()

    if (!aiService) {
      console.warn("⚠️ AI service not initialized yet")
      return null
    }

    return aiService.extractPromptContent()
  }
}
