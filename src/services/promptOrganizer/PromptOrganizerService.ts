/**
 * Prompt Organizer Service (Facade)
 * Main orchestration service for prompt organization
 */

import type {
  PromptOrganizerSettings,
  PromptOrganizerResult,
  TemplateCandidate,
  OrganizerExecutionEstimate,
  GenerationProgress,
} from "@/types/promptOrganizer"
import { PromptFilterService } from "./PromptFilterService"
import { TemplateGeneratorService } from "./TemplateGeneratorService"
import { templateConverter } from "./TemplateConverter"
import { categoryService } from "./CategoryService"
import { DEFAULT_CATEGORIES } from "./defaultCategories"
import { costEstimatorService } from "./CostEstimatorService"
import { templateSaveService } from "./TemplateSaveService"
import { promptsService } from "@/services/storage/prompts"

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
   * @param settings - Organizer settings
   * @param options - Execution options (progress callback)
   * @returns Organization result with templates
   */
  public async executeOrganization(
    settings: PromptOrganizerSettings,
    options?: {
      onProgress?: (progress: GenerationProgress) => void
    },
  ): Promise<PromptOrganizerResult> {
    // 1. Get all prompts
    const prompts = await promptsService.getAllPrompts()

    // 2. Filter prompts
    const targetPrompts = this.filterService.filterPrompts(prompts, settings)
    console.log(
      `${targetPrompts.length} prompts selected for organization`,
      targetPrompts,
    )
    console.log("Organization settings:", settings)

    if (targetPrompts.length === 0) {
      throw new Error("No prompts match the filter criteria")
    }

    const categories = await categoryService.getAll()

    // 3. Generate templates using Gemini with progress callback
    const { templates, usage } = await this.generatorService.generateTemplates(
      targetPrompts,
      settings,
      categories,
      {
        onProgress: options?.onProgress,
      },
    )

    // 4. Convert to template candidates using TemplateConverter
    const now = new Date()
    const templateCandidates: TemplateCandidate[] = await Promise.all(
      templates.map(async (template) => {
        // Use TemplateConverter for conversion with type inference and length constraints
        const candidate = templateConverter.convertToCandidate(
          template,
          settings.filterPeriodDays,
        )

        // Apply category validation with fallback
        const category = categories.find((c) => c.id === candidate.categoryId)

        return {
          ...candidate,
          categoryId: category
            ? candidate.categoryId
            : DEFAULT_CATEGORIES["other"].id, // Fallback to General
        }
      }),
    )

    // 5. Calculate estimated cost and actual cost
    const estimatedCost = costEstimatorService.calculateCost({
      inputTokens: usage.inputTokens,
      outputTokens: usage.inputTokens * 0.5,
    })
    const actualCost = costEstimatorService.calculateCost(usage)

    return {
      templates: templateCandidates,
      sourceCount: targetPrompts.length,
      periodDays: settings.filterPeriodDays,
      executedAt: now,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost,
      actualCost,
    }
  }

  /**
   * Cancel ongoing generation
   */
  public cancel(): void {
    this.generatorService.cancel()
  }

  /**
   * Estimate execution cost before execution
   * @param settings - Organizer settings
   * @returns Execution estimate
   */
  public async estimateExecution(
    settings: PromptOrganizerSettings,
  ): Promise<OrganizerExecutionEstimate> {
    return costEstimatorService.estimateExecution(settings)
  }

  /**
   * Save templates
   * @param candidates - Template candidates to save
   */
  public async saveTemplates(candidates: TemplateCandidate[]): Promise<void> {
    return templateSaveService.saveTemplates(candidates)
  }
}

export const promptOrganizerService = new PromptOrganizerService()
