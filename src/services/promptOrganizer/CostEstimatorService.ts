/**
 * Cost Estimator Service
 * Token usage and cost calculation
 */

import type {
  OrganizerExecutionEstimate,
  PromptOrganizerSettings,
} from "@/types/promptOrganizer"
import { GeminiClient } from "@/services/genai/GeminiClient"
import { GEMINI_CONTEXT_LIMIT } from "@/services/genai/constants"
import { promptFilterService } from "./PromptFilterService"
import { TemplateGeneratorService } from "./TemplateGeneratorService"
import { categoryService } from "./CategoryService"
import { promptsService } from "@/services/storage/prompts"

/**
 * Cost Estimator Service
 */
export class CostEstimatorService {
  private geminiClient: GeminiClient

  constructor() {
    this.geminiClient = GeminiClient.getInstance()
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
    // API key initialization is handled by AiModelContext
    if (!this.geminiClient.isInitialized()) {
      throw new Error(
        "API key not configured. Please set your API key in settings.",
      )
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
      [], // Empty presets array for cost estimation
    )

    // 4. Estimate token count
    const inputTokens = await this.geminiClient.estimateTokens(promptText)
    console.log("Estimated input tokens:", inputTokens)

    // 5. Calculate context usage
    return {
      targetPromptCount: targetPrompts.length,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: inputTokens * 1.5, // including thoughts tokens
      contextUsageRate: inputTokens / GEMINI_CONTEXT_LIMIT,
      model: "gemini-2.5-flash",
      contextLimit: GEMINI_CONTEXT_LIMIT,
    }
  }
}

export const costEstimatorService = new CostEstimatorService()
