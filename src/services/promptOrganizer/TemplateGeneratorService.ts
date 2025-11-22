/**
 * Template Generator Service
 * Generates prompt templates using Gemini API
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import { genaiApiKeyStorage } from "@/services/storage/definitions"
import type {
  PromptForOrganization,
  OrganizePromptsResponse,
  GeneratedTemplate,
  PromptOrganizerSettings,
  TokenUsage,
} from "@/types/promptOrganizer"

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
   * Based on PromptImprover.ts implementation
   */
  private async loadApiKey(): Promise<void> {
    // Try loading from storage first
    const storedApiKey = await genaiApiKeyStorage.getValue()

    if (storedApiKey && storedApiKey.trim() !== "") {
      this.geminiClient.initialize(storedApiKey)
      return
    }

    // In development mode, fallback to environment variable
    const isProductionMode = import.meta.env.MODE === "production"
    if (!isProductionMode) {
      const envApiKey = import.meta.env.WXT_GENAI_API_KEY
      if (envApiKey) {
        this.geminiClient.initialize(envApiKey)
        return
      }
    }

    // API key not configured - will throw error in generateTemplates
    console.warn("API key not configured")
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
    const prompt = this.buildPrompt(prompts, settings.organizationPrompt)

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

    // Call Gemini API
    const response =
      await this.geminiClient.generateStructuredContent<OrganizePromptsResponse>(
        prompt,
        schema,
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
  private buildPrompt(
    prompts: PromptForOrganization[],
    organizationPrompt: string,
  ): string {
    const promptList = prompts
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.name}\n   Content: ${p.content}\n   Execution count: ${p.executionCount}`,
      )
      .join("\n\n")

    return `${organizationPrompt}

Prompts to analyze:

${promptList}

Please generate templates in JSON format according to the schema.`
  }
}
