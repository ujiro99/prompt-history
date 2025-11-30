/**
 * Template Generator Service
 * Generates prompt templates using Gemini API
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { GeminiErrorType } from "@/services/genai/types"
import { getGenaiApiKey } from "@/services/storage/genaiApiKey"
import type {
  PromptForOrganization,
  OrganizePromptsResponse,
  GeneratedTemplate,
  PromptOrganizerSettings,
  TokenUsage,
  Category,
  GenerationProgress,
} from "@/types/promptOrganizer"
import { schema } from "./outputSchema"
import { SYSTEM_ORGANIZATION_INSTRUCTION } from "@/services/genai/defaultPrompts"

/**
 * Service for generating templates from prompts
 */
export class TemplateGeneratorService {
  private geminiClient: GeminiClient
  private abortController: AbortController | null = null

  constructor() {
    this.geminiClient = GeminiClient.getInstance()
  }

  /**
   * Load API key from storage or environment variable (dev mode only)
   */
  private async loadApiKey(): Promise<void> {
    const apiKey = await getGenaiApiKey()

    if (apiKey) {
      this.geminiClient.initialize(apiKey)
    } else {
      // API key not configured - will throw error in generateTemplates
      console.warn("API key not configured")
    }
  }

  /**
   * Generate templates from filtered prompts with streaming support
   * @param prompts - Filtered prompts for organization
   * @param settings - Organizer settings
   * @param categories - Available categories
   * @param options - Generation options (progress callback)
   * @returns Generated templates and token usage
   */
  public async generateTemplates(
    prompts: PromptForOrganization[],
    settings: PromptOrganizerSettings,
    categories: Array<Category>,
    options?: {
      onProgress?: (progress: GenerationProgress) => void
    },
  ): Promise<{ templates: GeneratedTemplate[]; usage: TokenUsage }> {
    // Create new AbortController for this request
    this.abortController = new AbortController()

    // Initialize client if not already initialized
    if (!this.geminiClient.isInitialized()) {
      await this.loadApiKey()
    }

    // Check if initialization succeeded
    if (!this.geminiClient.isInitialized()) {
      throw new Error(
        "API key not configured. Please set your API key in settings.",
      )
    }

    // Build prompt for Gemini
    const prompt = this.buildPrompt(
      prompts,
      settings.organizationPrompt,
      categories,
    )

    const config = {
      systemInstruction: SYSTEM_ORGANIZATION_INSTRUCTION,
    }

    try {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        thoughtsTokens: 0,
      }

      // Call Gemini API with streaming
      const response =
        await this.geminiClient.generateStructuredContentStream<OrganizePromptsResponse>(
          prompt,
          schema,
          config,
          {
            signal: this.abortController.signal,
            onProgress: (chunk, accumulated, tokenUsage) => {
              // Calculate progress based on JSON structure
              const progress = this.calculateProgress(
                accumulated,
                prompts.length,
                {
                  inputTokens: tokenUsage.prompt,
                  outputTokens: tokenUsage.candidates,
                  thoughtsTokens: tokenUsage.thoughts,
                },
              )
              const status = this.calculateStatus({
                inputTokens: tokenUsage.prompt,
                outputTokens: tokenUsage.candidates,
                thoughtsTokens: tokenUsage.thoughts,
              })

              options?.onProgress?.({
                chunk,
                accumulated,
                estimatedProgress: progress,
                status,
                outputTokens: tokenUsage.candidates,
                thoughtsTokens: tokenUsage.thoughts,
              })
              // Accumulate token usages
              usage.inputTokens = tokenUsage.prompt
              usage.thoughtsTokens = tokenUsage.thoughts
              usage.outputTokens = tokenUsage.candidates
            },
          },
        )

      console.info("Gemini response:", response)

      // Notify completion
      options?.onProgress?.({
        chunk: "",
        accumulated: "",
        estimatedProgress: 100,
        status: "complete",
        outputTokens: usage.outputTokens,
        thoughtsTokens: usage.thoughtsTokens,
      })

      return {
        templates: response.templates,
        usage,
      }
    } catch (error) {
      console.error("Error during template generation:", error)
      // Handle cancellation
      if (error instanceof Error) {
        const errorMessage = error.message
        if (
          errorMessage.includes("cancelled") ||
          (error as any).type === GeminiErrorType.CANCELLED
        ) {
          throw new Error("Generation cancelled by user")
        }
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
   * Calculate progress based on accumulated JSON
   * This is a heuristic - we look for key indicators in the partial JSON
   * @param accumulated - Accumulated JSON string
   * @param inputPromptCount - Number of input prompts
   * @param tokenUsage - Current token usage
   * @returns Estimated progress percentage (0-100)
   *   - 0: No progress
   *   - 20: Started receiving thoughtsToken.
   *   - 40-90: Receiving candidatesToken.
   *   - 100: Complete
   */
  private calculateProgress(
    accumulated: string,
    inputPromptCount: number,
    tokenUsage: TokenUsage,
  ): number {
    if (!accumulated) {
      if (tokenUsage.thoughtsTokens > 0) {
        return 20
      }
      return 0
    }

    // Try to count completed templates in partial JSON
    // Look for "title": pattern as indicator of template objects
    const titleMatches = accumulated.match(/"title":/g)
    const templateCount = titleMatches ? titleMatches.length : 0

    // Estimate total templates based on input tokens
    const estimatedTotal = inputPromptCount / 4
    const progress = Math.min((templateCount / estimatedTotal) * 50, 50) + 40

    return Math.round(progress)
  }

  /**
   * Calculate current status based on token usages
   * @param tokenUsage - Current token usage
   * @returns Status string
   * "sending" | "thinking" | "generating"
   */
  private calculateStatus(tokenUsage: TokenUsage) {
    if (tokenUsage.thoughtsTokens === 0) {
      return "sending"
    } else if (tokenUsage.outputTokens > 0) {
      return "generating"
    } else {
      return "thinking"
    }
  }

  /**
   * Build prompt for Gemini API
   * @param prompts - Filtered prompts
   * @param organizationPrompt - Custom organization prompt
   * @returns Formatted prompt
   */
  public buildPrompt(
    prompts: PromptForOrganization[],
    organizationPrompt: string,
    categories: Array<{ id: string; name: string }>,
  ): string {
    // Build category list
    const categoryList = categories
      .map((c) => `- ${c.id}: ${c.name}`)
      .join("\n")

    const promptList = prompts
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.name}\n   Content: ${p.content}\n   Execution count: ${p.executionCount}`,
      )
      .join("\n\n")

    return `${organizationPrompt}

Available Categories:
${categoryList}

Prompts to analyze:
${promptList}

Please generate templates in JSON format according to the schema.`
  }
}
