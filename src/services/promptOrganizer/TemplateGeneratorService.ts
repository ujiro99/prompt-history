/**
 * Template Generator Service
 * Generates prompt templates using Gemini API
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { GeminiError, GeminiErrorType } from "@/services/genai/types"
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

    // API key initialization is handled by AiModelContext
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

      // Sanitize response with fail-safe
      this.sanitizeTemplates(response.prompts)

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
        templates: response.prompts,
        usage,
      }
    } catch (error) {
      // Handle cancellation
      if (error instanceof Error) {
        const errorMessage = error.message
        if (
          errorMessage.includes("cancelled") ||
          (error instanceof GeminiError &&
            error.type === GeminiErrorType.CANCELLED)
        ) {
          console.warn(error)
          throw new Error("Generation cancelled by user")
        }
      }
      console.error("Error during template generation:", error)
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
   * Sanitize generated templates with fail-safe defaults
   * @param templates - Generated templates to sanitize
   */
  private sanitizeTemplates(templates: GeneratedTemplate[]): void {
    for (const template of templates) {
      for (const variable of template.variables) {
        if (variable.type === "select") {
          if (
            !variable.selectOptions ||
            !variable.selectOptions.options ||
            variable.selectOptions.options.length === 0
          ) {
            // Set fail-safe default
            console.warn(
              `Variable "${variable.name}" in template "${template.title}" has type "select" but missing selectOptions. Setting default empty options.`,
            )
            variable.selectOptions = {
              options: ["Option 1", "Option 2"],
            }
          }
        }
      }
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
      .map((c) => `- ID: ${c.id}  Name: ${c.name}`)
      .join("\n")

    const promptList = prompts
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.name}\n   ID: ${p.id}\n   Content: ${p.content}\n   Execution count: ${p.executionCount}`,
      )
      .join("\n\n")

    return `${organizationPrompt}

Available Categories:
${categoryList}

Prompts to analyze:
${promptList}

Please generate prompts in JSON format according to the schema.`
  }
}
