/**
 * Prompt Organizer Service (Facade)
 * Main orchestration service for prompt organization
 */

import type { Prompt } from "@/types/prompt"
import type {
  PromptOrganizerSettings,
  PromptOrganizerResult,
  TemplateCandidate,
} from "@/types/promptOrganizer"
import { PromptFilterService } from "./PromptFilterService"
import { TemplateGeneratorService } from "./TemplateGeneratorService"
import { categoryService } from "./CategoryService"
import { DEFAULT_CATEGORIES } from "./defaultCategories"

/**
 * Main service for prompt organization
 */
export class PromptOrganizerService {
  private filterService: PromptFilterService
  private generatorService: TemplateGeneratorService

  constructor() {
    this.filterService = new PromptFilterService()
    this.generatorService = new TemplateGeneratorService()
  }

  /**
   * Execute prompt organization
   * @param prompts - All prompts
   * @param settings - Organizer settings
   * @returns Organization result with templates
   */
  public async executeOrganization(
    prompts: Prompt[],
    settings: PromptOrganizerSettings,
  ): Promise<PromptOrganizerResult> {
    // 1. Filter prompts
    const targetPrompts = this.filterService.filterPrompts(prompts, settings)
    console.log(
      `${targetPrompts.length} prompts selected for organization`,
      targetPrompts,
    )
    console.log("Organization settings:", settings)

    if (targetPrompts.length === 0) {
      throw new Error("No prompts match the filter criteria")
    }

    // 2. Generate templates using Gemini
    const { templates, usage } = await this.generatorService.generateTemplates(
      targetPrompts,
      settings,
    )

    // 3. Convert to template candidates
    const now = new Date()
    const templateCandidates: TemplateCandidate[] = await Promise.all(
      templates.map(async (template) => {
        // Get category to validate it exists
        const category = await categoryService.getById(template.categoryId)

        return {
          id: crypto.randomUUID(),
          title: template.title.slice(0, 20), // Enforce max length
          content: template.content,
          useCase: template.useCase.slice(0, 40), // Enforce max length
          categoryId: category
            ? template.categoryId
            : DEFAULT_CATEGORIES["other"].id, // Fallback to General
          variables: template.variables.map((v) => ({
            name: v.name,
            type: "text" as const,
            description: v.description,
          })),
          aiMetadata: {
            generatedAt: now,
            sourcePromptIds: template.sourcePromptIds,
            sourceCount: template.sourcePromptIds.length,
            sourcePeriodDays: settings.filterPeriodDays,
            extractedVariables: template.variables,
            confirmed: false,
            showInPinned:
              template.sourcePromptIds.length >= 3 &&
              template.variables.length >= 2,
          },
          userAction: "pending" as const,
        }
      }),
    )

    // 4. Calculate estimated cost (simple calculation for MVP)
    const estimatedCost = this.calculateCost(
      usage.inputTokens,
      usage.outputTokens,
    )

    return {
      templates: templateCandidates,
      sourceCount: targetPrompts.length,
      periodDays: settings.filterPeriodDays,
      executedAt: now,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost,
    }
  }

  /**
   * Calculate cost based on token usage
   * Gemini 2.5 Flash pricing (as of Nov 2024)
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const INPUT_COST_PER_1M = 0.075 // $0.075 per 1M input tokens
    const OUTPUT_COST_PER_1M = 0.3 // $0.30 per 1M output tokens
    const USD_TO_JPY = 150 // Conversion rate

    const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M
    const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M
    const totalUsd = inputCost + outputCost

    return totalUsd * USD_TO_JPY
  }
}

export const promptOrganizerService = new PromptOrganizerService()
