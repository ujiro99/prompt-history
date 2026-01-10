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
import type { VariablePreset } from "@/types/prompt"
import { schema } from "./outputSchema"
import { SYSTEM_ORGANIZATION_INSTRUCTION } from "@/services/genai/defaultPrompts"
import { i18n } from "#imports"

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
   * @param presets - Available variable presets
   * @param recentAIPrompts - Recent AI-generated prompts for duplicate checking
   * @param options - Generation options (progress callback)
   * @returns Generated templates and token usage
   */
  public async generateTemplates(
    prompts: PromptForOrganization[],
    settings: PromptOrganizerSettings,
    categories: Array<Category>,
    presets: VariablePreset[],
    recentAIPrompts: PromptForOrganization[],
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
      presets,
      recentAIPrompts,
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
      this.sanitizeTemplates(response.prompts, presets)

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
   * @param presets - Available variable presets for validation
   */
  private sanitizeTemplates(
    templates: GeneratedTemplate[],
    presets: VariablePreset[],
  ): void {
    // Create preset ID lookup map for fast validation
    const presetIdSet = new Set(presets.map((p) => p.id))

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
        } else if (variable.type === "preset") {
          // Validate preset-type variables
          if (
            !variable.presetOptions ||
            !variable.presetOptions.presetId ||
            typeof variable.presetOptions.presetId !== "string"
          ) {
            // Missing presetOptions structure
            console.warn(
              `Variable "${variable.name}" in template "${template.title}" has type "preset" but missing presetOptions. Converting to text type.`,
            )
            // Convert to text type
            variable.type = "text"
            variable.defaultValue = ""
            delete variable.presetOptions
          } else if (!presetIdSet.has(variable.presetOptions.presetId)) {
            // Preset ID doesn't exist in available presets
            console.warn(
              `Variable "${variable.name}" in template "${template.title}" references non-existent preset "${variable.presetOptions.presetId}". Converting to text type.`,
            )
            // Convert to text type
            variable.type = "text"
            variable.defaultValue = ""
            delete variable.presetOptions
          }
        }
      }
    }
  }

  /**
   * Build YAML representation of variable presets
   * @param presets - Available variable presets
   * @returns YAML-formatted string
   */
  private buildPresetsYml(presets: VariablePreset[]): string {
    if (presets.length === 0) {
      return "presets: []"
    }

    const presetYmls = presets.map((preset) => {
      const lines: string[] = []
      lines.push(`  - id: "${preset.id}"`)
      lines.push(`    name: "${preset.name}"`)
      lines.push(`    type: "${preset.type}"`)

      if (preset.description) {
        lines.push(
          `    ${i18n.t("variablePresets.description_label")}: "${preset.description}"`,
        )
      }

      // Add type-specific content
      if (preset.type === "text" && preset.textContent) {
        // Escape and format multi-line text content
        const escapedContent = preset.textContent
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
        if (escapedContent.includes("\n")) {
          lines.push(`    content: |`)
          escapedContent.split("\n").forEach((line) => {
            lines.push(`      ${line}`)
          })
        } else {
          lines.push(`    content: "${escapedContent}"`)
        }
      } else if (preset.type === "select" && preset.selectOptions) {
        lines.push(`    options:`)
        preset.selectOptions.forEach((option) => {
          lines.push(`      - "${option}"`)
        })
      } else if (preset.type === "dictionary" && preset.dictionaryItems) {
        lines.push(`    items:`)
        preset.dictionaryItems.forEach((item) => {
          lines.push(`      - name: "${item.name}"`)
          const escapedContent = item.content
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
          if (escapedContent.includes("\n")) {
            lines.push(`        content: |`)
            escapedContent.split("\n").forEach((line) => {
              lines.push(`          ${line}`)
            })
          } else {
            lines.push(`        content: "${escapedContent}"`)
          }
        })
      }

      return lines.join("\n")
    })

    return `presets:\n${presetYmls.join("\n")}`
  }

  /**
   * Build prompt for Gemini API
   * @param prompts - Filtered prompts
   * @param organizationPrompt - Custom organization prompt
   * @param categories - Available categories
   * @param presets - Available variable presets
   * @param recentAIPrompts - Recent AI-generated prompts for duplicate checking
   * @returns Formatted prompt
   */
  public buildPrompt(
    prompts: PromptForOrganization[],
    organizationPrompt: string,
    categories: Array<{ id: string; name: string }>,
    presets: VariablePreset[],
    recentAIPrompts: PromptForOrganization[],
  ): string {
    // Build category list
    const categoryList = categories
      .map((c) => `- ID: ${c.id}  Name: ${c.name}`)
      .join("\n")

    // Build preset list in YAML format
    const presetYml = this.buildPresetsYml(presets)

    const promptList = prompts
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.name}\n   ID: ${p.id}\n   Content: ${p.content}\n   Execution count: ${p.executionCount}`,
      )
      .join("\n\n")

    // Build AI-generated prompts list
    const aiPromptList =
      recentAIPrompts.length > 0
        ? recentAIPrompts
            .map(
              (p, idx) =>
                `${idx + 1}. ${p.name}\n   Content: ${p.content}\n   Execution count: ${p.executionCount}`,
            )
            .join("\n\n")
        : "None"

    return `${organizationPrompt}

# Available Categories:
${categoryList}

# Available Variable Presets (YAML format):
${presetYml}

# Recently Created AI-Generated Prompts (within 90 days):
${aiPromptList}

# Prompts to analyze:
${promptList}

Please generate prompts in JSON format according to the schema.`
  }
}
