/**
 * Template Generator Service
 * Generates prompt templates using Gemini API
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { getGenaiApiKey } from "@/services/storage/genaiApiKey"
import type {
  PromptForOrganization,
  OrganizePromptsResponse,
  GeneratedTemplate,
  PromptOrganizerSettings,
  TokenUsage,
  Category,
} from "@/types/promptOrganizer"
import { SYSTEM_ORGANIZATION_INSTRUCTION } from "@/services/genai/defaultPrompts"

/**
 * Service for generating templates from prompts
 */
export class TemplateGeneratorService {
  private geminiClient: GeminiClient

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
   * Generate templates from filtered prompts
   * @param prompts - Filtered prompts for organization
   * @param settings - Organizer settings
   * @returns Generated templates and token usage
   */
  public async generateTemplates(
    prompts: PromptForOrganization[],
    settings: PromptOrganizerSettings,
    categories: Array<Category>,
  ): Promise<{ templates: GeneratedTemplate[]; usage: TokenUsage }> {
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

    // Define JSON schema for structured output
    const schema = {
      type: "object",
      properties: {
        templates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              useCase: { type: "string" },
              categoryId: { type: "string" },
              sourcePromptIds: {
                type: "array",
                items: { type: "string" },
              },
              variables: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
            required: [
              "title",
              "content",
              "useCase",
              "categoryId",
              "sourcePromptIds",
              "variables",
            ],
          },
        },
      },
      required: ["templates"],
    }

    const config = {
      systemInstruction: SYSTEM_ORGANIZATION_INSTRUCTION, // Fixed role definition
    }

    // Call Gemini API
    const response =
      await this.geminiClient.generateStructuredContent<OrganizePromptsResponse>(
        prompt,
        schema,
        config,
      )
    console.log("Gemini response:", response)

    // For MVP, we'll return mock token usage
    // TODO: Get actual token usage from Gemini API response
    const usage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
    }

    return {
      templates: response.templates,
      usage,
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
