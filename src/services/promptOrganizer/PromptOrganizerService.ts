/**
 * Prompt Organizer Service (Facade)
 * Main orchestration service for prompt organization
 */

import type {
  PromptOrganizerSettings,
  PromptOrganizerResult,
  TemplateCandidate,
  OrganizerExecutionEstimate,
} from "@/types/promptOrganizer"
import { PromptFilterService } from "./PromptFilterService"
import { TemplateGeneratorService } from "./TemplateGeneratorService"
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
   * @returns Organization result with templates
   */
  public async executeOrganization(
    settings: PromptOrganizerSettings,
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

    // 3. Generate templates using Gemini
    const { templates, usage } = await this.generatorService.generateTemplates(
      targetPrompts,
      settings,
      categories,
    )

    // 4. Convert to template candidates
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

    // 5. Calculate estimated cost
    const estimatedCost = costEstimatorService.calculateCost({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

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
