/**
 * Variable Generator Service
 * Wraps variable generation with progress tracking
 */

import { generateVariable } from "./core"
import { GeminiError, GeminiErrorType } from "@/services/genai/types"
import type {
  AIGenerationRequest,
  AIGenerationResponse,
} from "@/types/variableGeneration"
import type {
  GenerationProgress,
  TokenUsage,
} from "@/types/promptOrganizer"
import type { PresetVariableType } from "@/types/prompt"

export class VariableGeneratorService {
  private abortController: AbortController | null = null

  /**
   * Generate variable content with progress tracking
   */
  public async generateVariable(options: {
    request: AIGenerationRequest
    apiKey: string
    onProgress?: (progress: GenerationProgress) => void
  }): Promise<AIGenerationResponse> {
    // Create AbortController
    this.abortController = new AbortController()

    try {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        thoughtsTokens: 0,
      }

      // Call underlying generateVariable with progress mapping
      const response = await generateVariable({
        request: options.request,
        apiKey: options.apiKey,
        signal: this.abortController.signal,
        onProgress: (chunk, accumulated, tokenUsage) => {
          // Map Usage to TokenUsage
          usage.inputTokens = tokenUsage.prompt
          usage.thoughtsTokens = tokenUsage.thoughts
          usage.outputTokens = tokenUsage.candidates

          // Calculate progress and status
          const estimatedProgress = this.calculateProgress(
            accumulated,
            options.request.variableType,
            usage,
          )
          const status = this.calculateStatus(usage)

          // Invoke callback
          options.onProgress?.({
            chunk,
            accumulated,
            estimatedProgress,
            status,
            thoughtsTokens: usage.thoughtsTokens,
            outputTokens: usage.outputTokens,
          })
        },
      })

      // Notify completion
      options.onProgress?.({
        chunk: "",
        accumulated: "",
        estimatedProgress: 100,
        status: "complete",
        thoughtsTokens: usage.thoughtsTokens,
        outputTokens: usage.outputTokens,
      })

      return response
    } catch (error) {
      // Handle cancellation
      if (
        error instanceof GeminiError &&
        error.type === GeminiErrorType.CANCELLED
      ) {
        throw error
      }
      throw error
    } finally {
      this.abortController = null
    }
  }

  /**
   * Cancel ongoing generation
   */
  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * Calculate progress based on variable type and token usage
   */
  private calculateProgress(
    accumulated: string,
    variableType: PresetVariableType,
    tokenUsage: TokenUsage,
  ): number {
    // No progress yet
    if (!accumulated) {
      if (tokenUsage.thoughtsTokens > 0) {
        return 20 // Thinking phase
      }
      return 0
    }

    // Base progress from thinking phase
    let progress = 40

    // Calculate based on variable type
    switch (variableType) {
      case "text":
        // For text, estimate based on JSON structure
        // Look for "textContent" field
        if (accumulated.includes('"textContent"')) {
          progress = 50
          // Estimate completion based on accumulated length
          // Typical text response: ~500-2000 chars
          const estimatedTotal = 1000
          const additionalProgress = Math.min(
            (accumulated.length / estimatedTotal) * 40,
            40,
          )
          progress += additionalProgress
        }
        break

      case "select":
        // For select, count options in partial JSON
        const optionMatches = accumulated.match(/"selectOptions":\s*\[/g)
        if (optionMatches) {
          progress = 50
          // Look for comma-separated options
          const optionCount = (accumulated.match(/,\s*"/g) || []).length
          // Expect 3-10 options typically
          const additionalProgress = Math.min((optionCount / 8) * 40, 40)
          progress += additionalProgress
        }
        break

      case "dictionary":
        // For dictionary, count completed items
        const itemMatches = accumulated.match(/"name":\s*"/g)
        const itemCount = itemMatches ? itemMatches.length : 0
        if (itemCount > 0) {
          progress = 50
          // Expect 3-10 items typically
          const additionalProgress = Math.min((itemCount / 8) * 40, 40)
          progress += additionalProgress
        }
        break
    }

    return Math.round(Math.min(progress, 90))
  }

  /**
   * Calculate status based on token usage
   */
  private calculateStatus(
    tokenUsage: TokenUsage,
  ): "sending" | "thinking" | "generating" {
    if (tokenUsage.thoughtsTokens === 0) {
      return "sending"
    } else if (tokenUsage.outputTokens > 0) {
      return "generating"
    } else {
      return "thinking"
    }
  }
}
