/**
 * Tests for responseMerger (also known as responseConverter)
 */

import { describe, it, expect, vi } from "vitest"
import { mergeResponse, applyResponseToPreset } from "../responseMerger"
import type { VariablePreset } from "@/types/prompt"
import type {
  AIGenerationResponse,
  MergedAIGenerationResponse,
  ExistingVariableContent,
} from "@/types/variableGeneration"

// Mock uuid utility
vi.mock("@/lib/utils", () => ({
  uuid: vi.fn(() => "mock-uuid"),
}))

describe("responseMerger", () => {
  describe("mergeResponse", () => {
    describe("text type", () => {
      it("should return response as-is when no existing content", () => {
        const response: AIGenerationResponse = {
          textContent: "New text",
          explanation: "Test explanation",
        }

        const result = mergeResponse(response, "text")

        expect(result).toEqual(response)
      })

      it("should overwrite with generated content when existing content exists", () => {
        const response: AIGenerationResponse = {
          textContent: "New improved text",
          explanation: "Test explanation",
        }

        const existingContent: ExistingVariableContent = {
          textContent: "Old text",
        }

        const result = mergeResponse(response, "text", existingContent)

        expect(result.textContent).toBe("New improved text")
      })
    })

    describe("select type", () => {
      it("should return response as-is when no existing content", () => {
        const response: AIGenerationResponse = {
          selectOptions: ["Option 1", "Option 2", "Option 3"],
          explanation: "Test explanation",
        }

        const result = mergeResponse(response, "select")

        expect(result).toEqual(response)
      })

      it("should combine existing and generated options", () => {
        const response: AIGenerationResponse = {
          selectOptions: ["Option 3", "Option 4", "Option 5"],
          explanation: "Test explanation",
        }

        const existingContent: ExistingVariableContent = {
          selectOptions: ["Option 1", "Option 2"],
        }

        const result = mergeResponse(response, "select", existingContent)

        expect(result.selectOptions).toEqual([
          "Option 1",
          "Option 2",
          "Option 3",
          "Option 4",
          "Option 5",
        ])
      })

      it("should remove duplicate options (case-sensitive)", () => {
        const response: AIGenerationResponse = {
          selectOptions: ["Option 1", "Option 2", "option 1"],
          explanation: "Test explanation",
        }

        const existingContent: ExistingVariableContent = {
          selectOptions: ["Option 1", "Option 3"],
        }

        const result = mergeResponse(response, "select", existingContent)

        expect(result.selectOptions).toHaveLength(4)
        expect(result.selectOptions).toContain("Option 1")
        expect(result.selectOptions).toContain("option 1")
        expect(result.selectOptions).toContain("Option 2")
        expect(result.selectOptions).toContain("Option 3")
      })
    })

    describe("dictionary type", () => {
      it("should return response with converted items when no existing content", () => {
        const response: AIGenerationResponse = {
          dictionaryItems: [
            { name: "Item 1", content: "Content 1" },
            { name: "Item 2", content: "Content 2" },
            { name: "Item 3", content: "Content 3" },
          ],
          explanation: "Test explanation",
        }

        const result = mergeResponse(response, "dictionary")

        expect(result.dictionaryItems).toHaveLength(3)
        expect(result.dictionaryItems![0]).toHaveProperty("id")
        expect(result.dictionaryItems![0].id.startsWith("dictItem_")).toBe(true)
        expect(result.dictionaryItems![0]).toHaveProperty("isAiGenerated", true)
      })

      it("should combine existing and generated items (existing first)", () => {
        const response: AIGenerationResponse = {
          dictionaryItems: [
            { name: "Generated 1", content: "Generated Content 1" },
            { name: "Generated 2", content: "Generated Content 2" },
          ],
          explanation: "Test explanation",
        }

        const existingContent: ExistingVariableContent = {
          dictionaryItems: [
            {
              id: "existing-1",
              name: "Existing 1",
              content: "Existing Content 1",
            },
            {
              id: "existing-2",
              name: "Existing 2",
              content: "Existing Content 2",
            },
          ],
        }

        const result = mergeResponse(response, "dictionary", existingContent)

        expect(result.dictionaryItems).toHaveLength(4)
        expect(result.dictionaryItems![0].name).toBe("Existing 1")
        expect(result.dictionaryItems![1].name).toBe("Existing 2")
        expect(result.dictionaryItems![2].name).toBe("Generated 1")
        expect(result.dictionaryItems![3].name).toBe("Generated 2")
      })

      it("should set isAiGenerated flag for generated items", () => {
        const response: AIGenerationResponse = {
          dictionaryItems: [
            { name: "Item 1", content: "Content 1" },
            { name: "Item 2", content: "Content 2" },
          ],
          explanation: "Test explanation",
        }

        const result = mergeResponse(response, "dictionary")

        // After merging, dictionaryItems are DictionaryItem[] with id and isAiGenerated
        expect(result.dictionaryItems).toHaveLength(2)
        expect(result.dictionaryItems![0]).toHaveProperty("isAiGenerated", true)
        expect(result.dictionaryItems![1]).toHaveProperty("isAiGenerated", true)
      })

      it("should preserve existing items without isAiGenerated flag", () => {
        const response: AIGenerationResponse = {
          dictionaryItems: [
            { name: "Generated", content: "Generated Content" },
          ],
          explanation: "Test explanation",
        }

        const existingContent: ExistingVariableContent = {
          dictionaryItems: [
            {
              id: "existing-1",
              name: "Existing",
              content: "Existing Content",
              isAiGenerated: false,
            },
          ],
        }

        const result = mergeResponse(response, "dictionary", existingContent)

        expect(result.dictionaryItems![0]).toHaveProperty(
          "isAiGenerated",
          false,
        )
        expect(result.dictionaryItems![1]).toHaveProperty("isAiGenerated", true)
      })
    })
  })

  describe("applyResponseToPreset", () => {
    const basePreset: VariablePreset = {
      id: "preset-1",
      name: "Test Preset",
      description: "Test description",
      type: "text",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    }

    it("should apply text content to text type preset", () => {
      const preset: VariablePreset = {
        ...basePreset,
        type: "text",
      }

      const response: MergedAIGenerationResponse = {
        textContent: "Generated text content",
        explanation: "AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.textContent).toBe("Generated text content")
      expect(result.aiExplanation).toBe("AI explanation")
      expect(result.isAiGenerated).toBe(true)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        preset.updatedAt.getTime(),
      )
    })

    it("should apply select options to select type preset", () => {
      const preset: VariablePreset = {
        ...basePreset,
        type: "select",
      }

      const response: MergedAIGenerationResponse = {
        selectOptions: ["Option A", "Option B", "Option C"],
        explanation: "AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.selectOptions).toEqual(["Option A", "Option B", "Option C"])
      expect(result.aiExplanation).toBe("AI explanation")
      expect(result.isAiGenerated).toBe(true)
    })

    it("should apply dictionary items to dictionary type preset", () => {
      const preset: VariablePreset = {
        ...basePreset,
        type: "dictionary",
      }

      const response: MergedAIGenerationResponse = {
        dictionaryItems: [
          {
            id: "1",
            name: "Item 1",
            content: "Content 1",
            isAiGenerated: true,
          },
          {
            id: "2",
            name: "Item 2",
            content: "Content 2",
            isAiGenerated: true,
          },
        ],
        explanation: "AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.dictionaryItems).toEqual(response.dictionaryItems)
      expect(result.aiExplanation).toBe("AI explanation")
      expect(result.isAiGenerated).toBe(true)
    })

    it("should set isAiGenerated flag", () => {
      const preset: VariablePreset = {
        ...basePreset,
        type: "text",
      }

      const response: MergedAIGenerationResponse = {
        textContent: "Generated text",
        explanation: "AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.isAiGenerated).toBe(true)
    })

    it("should set aiExplanation field", () => {
      const preset: VariablePreset = {
        ...basePreset,
        type: "text",
      }

      const response: MergedAIGenerationResponse = {
        textContent: "Generated text",
        explanation: "This is the AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.aiExplanation).toBe("This is the AI explanation")
    })

    it("should update updatedAt timestamp", () => {
      const oldDate = new Date("2024-01-01")
      const preset: VariablePreset = {
        ...basePreset,
        type: "text",
        updatedAt: oldDate,
      }

      const response: MergedAIGenerationResponse = {
        textContent: "Generated text",
        explanation: "AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    })

    it("should preserve other preset fields", () => {
      const preset = {
        ...basePreset,
        type: "text" as const,
        customField: "custom value",
      } as VariablePreset & { customField: string }

      const response: MergedAIGenerationResponse = {
        textContent: "Generated text",
        explanation: "AI explanation",
      }

      const result = applyResponseToPreset(preset, response)

      expect(result.id).toBe(preset.id)
      expect(result.name).toBe(preset.name)
      expect(result.description).toBe(preset.description)
      expect(result.createdAt).toBe(preset.createdAt)
      expect((result as any).customField).toBe("custom value")
    })
  })
})
