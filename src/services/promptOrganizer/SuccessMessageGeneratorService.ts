/**
 * Success Message Generator Service
 * Generates user-friendly success messages for generated templates
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import type { GeneratedTemplate } from "@/types/promptOrganizer"
import { ORGANIZATION_SUMMARY_PROMPT } from "@/services/genai/defaultPrompts"
import { categoryService } from "./CategoryService"

const MSG_SCHEMA = {
  type: "object",
  properties: {
    how_it_was_created: {
      type: "string",
      description: "Explanation of how the template was created",
      maxLength: 160,
    },
    user_benefit: {
      type: "string",
      description: "Explanation of the benefits of using the template",
      maxLength: 160,
    },
  },
  required: ["how_it_was_created", "user_benefit"],
} as const

export interface MessageGenerationResponse {
  how_it_was_created: string
  user_benefit: string
}

/**
 * Service for generating success messages from templates
 */
export class SuccessMessageGeneratorService {
  private geminiClient: GeminiClient

  constructor() {
    this.geminiClient = GeminiClient.getInstance()
  }

  /**
   * Generate a user-friendly success message for a template
   * @param template - Generated template
   * @param signal - Optional abort signal for cancellation
   * @param onStream - Optional callback for streaming chunks
   * @returns Success message in plain text
   */
  public async generateSuccessMessage(
    template: GeneratedTemplate,
    signal?: AbortSignal,
  ): Promise<string[]> {
    // API key initialization is handled by AiModelContext
    if (!this.geminiClient.isInitialized()) {
      throw new Error(
        "API key not configured. Please set your API key in settings.",
      )
    }

    const categories = await categoryService.getAll()

    // Build prompt with template data
    const inputData = {
      title: template.title,
      content: template.content,
      useCase: template.useCase,
      clusterExplanation: template.clusterExplanation,
      category: categories.find((c) => c.id === template.categoryId)?.name,
      sourcePromptCount: template.sourcePromptIds.length,
      variables: template.variables,
    }
    const templateJson = JSON.stringify(inputData, null, 2)
    const prompt = `${ORGANIZATION_SUMMARY_PROMPT}\n${templateJson}`

    const systemInstruction = `You are a UX writing expert.
Your role is to suggest better prompts for users who interact with AI chatbots daily.

CRITICAL RULES:
  - Output in language code: ${chrome.i18n.getUILanguage()}`

    try {
      // Generate success message using Gemini stream
      const ret =
        await this.geminiClient.generateStructuredContentStream<MessageGenerationResponse>(
          prompt,
          MSG_SCHEMA,
          {
            model: "gemini-2.5-flash-lite",
            systemInstruction,
            generateContentConfig: {
              thinkingConfig: {
                includeThoughts: false,
              },
            },
          },
          { signal },
        )

      // Return the generated text
      return [ret.how_it_was_created, ret.user_benefit]
    } catch (error) {
      console.error("Error generating success message:", error)
      throw error
    }
  }
}

export const successMessageGeneratorService =
  new SuccessMessageGeneratorService()
