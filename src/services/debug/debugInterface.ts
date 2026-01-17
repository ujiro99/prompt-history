import { PromptServiceFacade } from "../promptServiceFacade"
import type { ServiceElementInfo } from "../aiService/base/types"
import { StorageService } from "@/services/storage"
import type { PromptHistoryDebugInterface } from "@/types/global.d.ts"

const storage = StorageService.getInstance()

/**
 * Debug interface for testing and debugging prompt-autocraft extension
 * Only available in non-production environments
 */
export class DebugInterface implements PromptHistoryDebugInterface {
  private static instance: DebugInterface | null = null

  private constructor() { }

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
  private getFacade(): PromptServiceFacade {
    return PromptServiceFacade.getInstance()
  }

  /**
   * Test all selectors for the current AI service
   */
  testSelectors(): void {
    const facade = this.getFacade()
    const aiService = facade.getAIService()

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
    const facade = this.getFacade()
    const aiService = facade.getAIService()

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
    const facade = this.getFacade()
    const aiService = facade.getAIService()

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
    const facade = this.getFacade()
    const aiService = facade.getAIService()

    if (!aiService) {
      console.warn("⚠️ AI service not initialized yet")
      return null
    }

    return aiService.extractPromptContent()
  }

  /**
   * Remove cached AI service configurations
   */
  async removeConfig(): Promise<void> {
    await storage.removeAiConfigCache()
    console.log("✅ AI config cache cleared successfully")
  }
}
