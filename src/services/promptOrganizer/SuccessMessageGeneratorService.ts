/**
 * Success Message Generator Service
 * Generates user-friendly success messages for generated templates
 */

import { GeminiClient } from "@/services/genai/GeminiClient"
import type { GeneratedTemplate } from "@/types/promptOrganizer"
import { ORGANIZATION_SUMMARY_PROMPT } from "@/services/genai/defaultPrompts"

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
  ): Promise<string> {
    // API key initialization is handled by AiModelContext
    if (!this.geminiClient.isInitialized()) {
      throw new Error(
        "API key not configured. Please set your API key in settings.",
      )
    }

    // Build prompt with template data
    const templateJson = JSON.stringify(template, null, 2)
    const prompt = `${ORGANIZATION_SUMMARY_PROMPT}\n${templateJson}`

    const systemInstruction = `You are a UX writing expert.
Your role is to suggest better prompts for users who interact with AI chatbots daily.

CRITICAL RULES:
  - Output in language code: ${chrome.i18n.getUILanguage()}`

    try {
      // Generate success message using Gemini stream
      let accumulatedText = ""
      const stream = this.geminiClient.generateContentStream(prompt, {
        model: "gemini-2.5-flash-lite",
        systemInstruction,
        generateContentConfig: {
          thinkingConfig: {
            includeThoughts: false,
          },
        },
      })

      for await (const chunk of stream) {
        // Check for cancellation
        if (signal?.aborted) {
          throw new Error("Generation cancelled")
        }
        accumulatedText += chunk.text
      }

      // Return the generated text
      return accumulatedText.trim()
    } catch (error) {
      console.error("Error generating success message:", error)
      throw error
    }
  }
}

export const successMessageGeneratorService =
  new SuccessMessageGeneratorService()
