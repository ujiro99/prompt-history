/**
 * Variable Generation Estimator Service
 * Estimates token usage for variable generation before execution
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { GEMINI_CONTEXT_LIMIT } from "@/services/genai/constants"
import type {
  VariableGenerationEstimate,
  VariableGenerationSettings,
} from "@/types/variableGeneration"
import {
  generateMetaPrompt,
  getPromptHistoryCount,
  watch,
  type GenerateMetaPromptOptions,
} from "./metaPromptGenerator"
import { fetchPromptHistoryWithCount } from "./promptHistoryFetcher"

/**
 * Variable Generation Estimator Service
 */
export class VariableGenerationEstimatorService {
  private geminiClient: GeminiClient

  constructor() {
    this.geminiClient = GeminiClient.getInstance()
  }

  /**
   * Estimate token usage and context for variable generation
   * This method fetches prompt history internally to get accurate count
   *
   * @param options - Options without promptHistory (will be fetched internally)
   * @returns Estimation with token counts and context usage
   */
  async estimateGeneration(
    options: Omit<GenerateMetaPromptOptions, "promptHistory">,
  ): Promise<VariableGenerationEstimate> {
    // Fetch prompt history with count
    const historyCount = await getPromptHistoryCount()
    const { promptHistory, promptCount } =
      await fetchPromptHistoryWithCount(historyCount)

    // Generate meta-prompt
    const metaPrompt = await generateMetaPrompt({
      ...options,
      promptHistory,
    })

    // Estimate input tokens
    const estimatedInputTokens =
      await this.geminiClient.estimateTokens(metaPrompt)

    // Calculate context usage rate
    const contextUsageRate = estimatedInputTokens / GEMINI_CONTEXT_LIMIT

    return {
      promptHistoryCount: promptCount,
      estimatedInputTokens,
      contextUsageRate,
      model: "gemini-2.5-flash",
      contextLimit: GEMINI_CONTEXT_LIMIT,
    }
  }

  watch(
    cb: (
      newVal: VariableGenerationSettings,
      oldVal: VariableGenerationSettings,
    ) => void,
  ) {
    return watch(cb)
  }
}

export const variableGenerationEstimatorService =
  new VariableGenerationEstimatorService()
