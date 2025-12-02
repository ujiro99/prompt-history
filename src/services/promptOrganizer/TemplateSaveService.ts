/**
 * Template Save Service
 * Persist template candidates
 */

import type { TemplateCandidate } from "@/types/promptOrganizer"
import { templateConverter } from "./TemplateConverter"
import { promptsService } from "@/services/storage/prompts"
import { pinsService } from "@/services/storage/pins"

/**
 * Template Save Service
 */
export class TemplateSaveService {
  /**
   * Save selected templates
   *
   * @param candidates Template candidates to save
   */
  async saveTemplates(candidates: TemplateCandidate[]): Promise<void> {
    const toSave = candidates.filter(
      (c) => c.userAction === "save" || c.userAction === "save_and_pin",
    )

    console.log(`Saving ${toSave.length} templates`, toSave)

    for (const candidate of toSave) {
      // Convert TemplateCandidate to Prompt
      const prompt = templateConverter.convertToPrompt(candidate)

      // Save as Prompt
      const savedPrompt = await promptsService.savePrompt(prompt)

      // Pin if needed
      if (candidate.userAction === "save_and_pin") {
        await pinsService.pinPrompt(savedPrompt.id)
      }
    }
  }
}

export const templateSaveService = new TemplateSaveService()
