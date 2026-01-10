/**
 * Cost Estimator Service
 * Token usage and cost calculation
 */

import type {
  OrganizerExecutionEstimate,
  PromptForOrganization,
  PromptOrganizerSettings,
} from "@/types/promptOrganizer"
import { GeminiClient } from "@/services/genai/GeminiClient"
import { GEMINI_CONTEXT_LIMIT } from "@/services/genai/constants"
import { TemplateGeneratorService } from "./TemplateGeneratorService"
import type { VariablePreset } from "@/types/prompt"

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
    prompts: PromptForOrganization[],
    settings: PromptOrganizerSettings,
    categories: Array<{ id: string; name: string }>,
    presets: VariablePreset[],
  ): Promise<OrganizerExecutionEstimate> {
    // API key initialization is handled by AiModelContext
    if (!this.geminiClient.isInitialized()) {
      throw new Error(
        "API key not configured. Please set your API key in settings.",
      )
    }

    // 1. Build prompt text
    const generator = new TemplateGeneratorService()
    const promptText = generator.buildPrompt(
      prompts,
      settings.organizationPrompt,
      categories,
      presets,
      [], // Empty array for cost estimation (no need for AI prompts in estimation)
    )

    // 2. Estimate token count
    const inputTokens = await this.geminiClient.estimateTokens(promptText)
    console.log("Estimated input tokens:", inputTokens)

    // 3. Calculate context usage
    return {
      targetPromptCount: prompts.length,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: inputTokens * 1.5, // including thoughts tokens
      contextUsageRate: inputTokens / GEMINI_CONTEXT_LIMIT,
      model: "gemini-2.5-flash",
      contextLimit: GEMINI_CONTEXT_LIMIT,
    }
  }
}

export const costEstimatorService = new CostEstimatorService()
