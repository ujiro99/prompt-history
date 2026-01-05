/**
 * Tests for metaPromptGenerator
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { PresetVariableType } from "@/types/prompt"
import type {
  ExistingVariableContent,
  VariableGenerationSettings,
} from "@/types/variableGeneration"
import {
  DEFAULT_META_PROMPT,
  INPUT_SECTION,
  ADDITION_TO_EXISTING_VARIABLES,
  MODIFICATION_TO_EXISTING_VARIABLES,
  ADDITIONAL_INSTRUCTIONS,
} from "../defaultPrompts"

// Mock storage using vi.hoisted
const { mockGetValue } = vi.hoisted(() => ({
  mockGetValue: vi.fn(),
}))

vi.mock("@/services/storage/definitions", () => ({
  variableGenerationSettingsStorage: {
    getValue: mockGetValue,
    watch: vi.fn(),
  },
}))

// Note: #imports (i18n) is already mocked globally in src/test/setup.ts

import { variableGenerationSettingsStorage } from "@/services/storage/definitions"
import {
  generateMetaPrompt,
  getPromptHistoryCount,
} from "../metaPromptGenerator"

describe("metaPromptGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generateMetaPrompt", () => {
    it("should load default template when useDefault is true", async () => {
      const mockSettings: VariableGenerationSettings = {
        useDefault: true,
        promptHistoryCount: 200,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await generateMetaPrompt({
        variableName: "testVar",
        variablePurpose: "test purpose",
        variableType: "text",
        promptHistory: "test history",
      })

      expect(result).toContain("# Task")
      expect(result).toContain("# Instruction Steps")
    })

    it("should use custom prompt when useDefault is false", async () => {
      const customPrompt = "Custom prompt template"
      const mockSettings: VariableGenerationSettings = {
        useDefault: false,
        customPrompt,
        promptHistoryCount: 200,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await generateMetaPrompt({
        variableName: "testVar",
        variablePurpose: "test purpose",
        variableType: "text",
        promptHistory: "test history",
      })

      expect(result).toContain(customPrompt)
    })

    it("should replace template variables correctly", async () => {
      const mockSettings: VariableGenerationSettings = {
        useDefault: true,
        promptHistoryCount: 200,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await generateMetaPrompt({
        variableName: "myVariable",
        variablePurpose: "my purpose",
        variableType: "select",
        promptHistory: "my history",
      })

      expect(result).toContain("Variable name: myVariable")
      expect(result).toContain("Purpose of the variable: my purpose")
      expect(result).toContain("Variable type: variableTypes.select")
      expect(result).toContain("my history")
    })

    it("should handle empty prompt history without errors", async () => {
      const mockSettings: VariableGenerationSettings = {
        useDefault: true,
        promptHistoryCount: 200,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await generateMetaPrompt({
        variableName: "testVar",
        variablePurpose: "test purpose",
        variableType: "text",
        promptHistory: "",
      })

      expect(result).toContain("(no prompt history available)")
    })

    it("should append INPUT_SECTION at the end", async () => {
      const mockSettings: VariableGenerationSettings = {
        useDefault: true,
        promptHistoryCount: 200,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await generateMetaPrompt({
        variableName: "testVar",
        variablePurpose: "test purpose",
        variableType: "text",
        promptHistory: "test history",
      })

      expect(result).toContain("# Input")
      expect(result.indexOf("# Input")).toBeGreaterThan(0)
    })

    describe("existing content handling", () => {
      it("should append MODIFICATION section for text type with existing content", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const existingContent: ExistingVariableContent = {
          textContent: "Existing text",
        }

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "text",
          promptHistory: "test history",
          existingContent,
        })

        expect(result).toContain("# Existing Variable")
        expect(result).toContain("improve the content")
        expect(result).toContain("Existing text content:\nExisting text")
      })

      it("should append ADDITION section for select type with existing content", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const existingContent: ExistingVariableContent = {
          selectOptions: ["Option 1", "Option 2"],
        }

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "select",
          promptHistory: "test history",
          existingContent,
        })

        expect(result).toContain("# Existing Variables")
        expect(result).toContain("does not duplicate")
        expect(result).toContain("Existing options: Option 1, Option 2")
      })

      it("should append ADDITION section for dictionary type with existing content", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const existingContent: ExistingVariableContent = {
          dictionaryItems: [
            {
              id: "1",
              name: "Item 1",
              content:
                "This is a long content that exceeds 100 characters to test the preview feature which should truncate the text at 100 characters",
            },
            { id: "2", name: "Item 2", content: "Short content" },
          ],
        }

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "dictionary",
          promptHistory: "test history",
          existingContent,
        })

        expect(result).toContain("# Existing Variables")
        expect(result).toContain("does not duplicate")
        expect(result).toContain("Existing dictionary items:")
        expect(result).toContain("- Item 1:")
        expect(result).toContain("...")
        expect(result).toContain("- Item 2: Short content")
      })

      it("should not append existing section when existing content is empty", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const existingContent: ExistingVariableContent = {
          selectOptions: [],
        }

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "select",
          promptHistory: "test history",
          existingContent,
        })

        expect(result).not.toContain("# Existing Variables")
        expect(result).not.toContain("Existing options:")
      })
    })

    describe("additional instructions handling", () => {
      it("should append additional instructions when provided", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "text",
          promptHistory: "test history",
          additionalInstructions: "Please make it formal",
        })

        expect(result).toContain("# Additional Instructions")
        expect(result).toContain("Please make it formal")
      })

      it("should not append additional instructions when empty", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "text",
          promptHistory: "test history",
          additionalInstructions: "",
        })

        expect(result).not.toContain("# Additional Instructions")
      })

      it("should trim additional instructions", async () => {
        const mockSettings: VariableGenerationSettings = {
          useDefault: true,
          promptHistoryCount: 200,
        }
        vi.mocked(variableGenerationSettingsStorage.getValue).mockResolvedValue(
          mockSettings,
        )

        const result = await generateMetaPrompt({
          variableName: "testVar",
          variablePurpose: "test purpose",
          variableType: "text",
          promptHistory: "test history",
          additionalInstructions: "  \n  Instructions  \n  ",
        })

        expect(result).toContain("Instructions")
        expect(result).not.toContain("  \n  Instructions  \n  ")
      })
    })
  })

  describe("getPromptHistoryCount", () => {
    it("should return default count (200) when no settings exist", async () => {
      mockGetValue.mockResolvedValue(null)

      const result = await getPromptHistoryCount()

      expect(result).toBe(200)
    })

    it("should return custom count from settings", async () => {
      const mockSettings: VariableGenerationSettings = {
        useDefault: true,
        promptHistoryCount: 500,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await getPromptHistoryCount()

      expect(result).toBe(500)
    })

    it("should return default count when setting value is undefined", async () => {
      const mockSettings: VariableGenerationSettings = {
        useDefault: true,
        promptHistoryCount: undefined as any,
      }
      mockGetValue.mockResolvedValue(mockSettings)

      const result = await getPromptHistoryCount()

      expect(result).toBe(200)
    })
  })
})
