/**
 * Cost Estimator Service
 * Token usage and cost calculation
 */

import type {
  TokenUsage,
  OrganizerExecutionEstimate,
  PromptOrganizerSettings,
} from "@/types/promptOrganizer"
import { GeminiClient } from "@/services/genai/GeminiClient"
import { promptFilterService } from "./PromptFilterService"
import { TemplateGeneratorService } from "./TemplateGeneratorService"
import { categoryService } from "./CategoryService"
import { promptsService } from "@/services/storage/prompts"
import { GEMINI_PRICING, GEMINI_CONTEXT_LIMIT } from "./pricing"
import { genaiApiKeyStorage } from "@/services/storage/definitions"

/**
 * Cost Estimator Service
 */
class CostEstimatorService {
  private geminiClient: GeminiClient

  constructor() {
    this.geminiClient = GeminiClient.getInstance()
  }

  private async loadApiKey(): Promise<void> {
    const apiKey = await genaiApiKeyStorage.getValue()
    this.geminiClient.initialize(apiKey)
  }

  /**
   * Calculate cost from token usage
   *
   * @param usage Token usage
   * @returns Cost in JPY
   */
  calculateCost(usage: TokenUsage): number {
    const inputCost =
      (usage.inputTokens / 1_000_000) * GEMINI_PRICING.inputTokenPer1M
    const outputCost =
      (usage.outputTokens / 1_000_000) * GEMINI_PRICING.outputTokenPer1M
    const totalUsd = inputCost + outputCost
    return totalUsd * GEMINI_PRICING.usdToJpy
  }

  /**
   * Estimate execution cost before execution
   *
   * @param settings Organizer settings
   * @returns Execution estimate
   */
  async estimateExecution(
    settings: PromptOrganizerSettings,
  ): Promise<OrganizerExecutionEstimate> {
    if (!this.geminiClient.isInitialized()) {
      await this.loadApiKey()
    }

    // 1. Get all prompts
    const allPrompts = await promptsService.getAllPrompts()

    // 2. Filter target prompts
    const targetPrompts = promptFilterService.filterPrompts(
      allPrompts,
      settings,
    )

    // 3. Build prompt text
    const generator = new TemplateGeneratorService()
    const promptText = generator.buildPrompt(
      targetPrompts,
      settings.organizationPrompt,
      await categoryService.getAll(),
    )

    // 4. Estimate token count
    const inputTokens = await this.geminiClient.estimateTokens(promptText)
    console.log("Estimated input tokens:", inputTokens)

    // 5. Calculate cost (estimate output tokens as 0.5 x input tokens)
    const estimatedCost = this.calculateCost({
      inputTokens,
      outputTokens: inputTokens * 0.5,
    })

    return {
      targetPromptCount: targetPrompts.length,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: inputTokens * 0.5,
      contextUsageRate: inputTokens / GEMINI_CONTEXT_LIMIT,
      estimatedCost,
      model: "gemini-2.5-flash",
      contextLimit: GEMINI_CONTEXT_LIMIT,
    }
  }
}

export const costEstimatorService = new CostEstimatorService()
