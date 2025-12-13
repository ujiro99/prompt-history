import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  getVariablePresets,
  saveVariablePreset,
  deleteVariablePreset,
  duplicateVariablePreset,
  findPromptsByPresetId,
  exportVariablePresets,
  importVariablePresets,
} from "../variablePresetStorage"
import type { VariablePreset, Prompt } from "../../../types/prompt"
import { variablePresetsStorage, promptsStorage } from "../definitions"

// Mock storage definitions
vi.mock("../definitions", () => ({
  variablePresetsStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
  promptsStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
}))

describe("variablePresetStorage", () => {
  const mockPreset: VariablePreset = {
    id: "preset-1",
    name: "Test Preset",
    type: "text",
    description: "Test description",
    textContent: "Test content",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }

  const mockDictionaryPreset: VariablePreset = {
    id: "preset-2",
    name: "Role",
    type: "dictionary",
    description: "User roles",
    dictionaryItems: [
      { id: "item-1", name: "Customer", content: "You are a customer..." },
      { id: "item-2", name: "Manager", content: "You are a manager..." },
    ],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }

  const mockPrompt: Prompt = {
    id: "prompt-1",
    name: "Test Prompt",
    content: "Hello {{role}}",
    executionCount: 0,
    lastExecutedAt: new Date("2024-01-01"),
    isPinned: false,
    lastExecutionUrl: "",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    variables: [
      {
        name: "role",
        type: "preset",
        presetId: "preset-2",
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getVariablePresets", () => {
    it("should return empty array when no presets exist", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      const result = await getVariablePresets()

      expect(result).toEqual([])
    })

    it("should return presets when data exists", async () => {
      const stored = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(stored)

      const result = await getVariablePresets()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockPreset)
    })

    it("should convert ISO strings to Date objects", async () => {
      const stored = {
        "preset-1": {
          ...mockPreset,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(stored)

      const result = await getVariablePresets()

      expect(result[0].createdAt).toBeInstanceOf(Date)
      expect(result[0].updatedAt).toBeInstanceOf(Date)
    })
  })

  describe("saveVariablePreset", () => {
    it("should create new preset when preset does not exist", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      await saveVariablePreset(mockPreset)

      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith(
        expect.objectContaining({
          "preset-1": expect.objectContaining({
            id: "preset-1",
            name: "Test Preset",
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        }),
      )
    })

    it("should update existing preset", async () => {
      const existing = {
        "preset-1": {
          ...mockPreset,
          name: "Old Name",
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(existing)

      const updated = { ...mockPreset, name: "New Name" }
      await saveVariablePreset(updated)

      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith(
        expect.objectContaining({
          "preset-1": expect.objectContaining({
            name: "New Name",
          }),
        }),
      )
    })

    it("should update updatedAt timestamp", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})
      const now = new Date()

      await saveVariablePreset(mockPreset)

      const call = vi.mocked(variablePresetsStorage.setValue).mock.calls[0]
      const saved = call[0]["preset-1"]
      expect(new Date(saved.updatedAt).getTime()).toBeGreaterThanOrEqual(
        now.getTime(),
      )
    })
  })

  describe("deleteVariablePreset", () => {
    it("should delete preset and return empty array when no prompts reference it", async () => {
      const presets = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)
      vi.mocked(promptsStorage.getValue).mockResolvedValue({})

      const affectedPromptIds = await deleteVariablePreset("preset-1")

      expect(affectedPromptIds).toEqual([])
      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith({})
    })

    it("should delete preset and return affected prompt IDs", async () => {
      const presets = {
        "preset-2": {
          ...mockDictionaryPreset,
          createdAt: mockDictionaryPreset.createdAt.toISOString(),
          updatedAt: mockDictionaryPreset.updatedAt.toISOString(),
        },
      }
      const prompts = {
        "prompt-1": {
          ...mockPrompt,
          createdAt: mockPrompt.createdAt.toISOString(),
          updatedAt: mockPrompt.updatedAt.toISOString(),
          lastExecutedAt: mockPrompt.lastExecutedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)
      vi.mocked(promptsStorage.getValue).mockResolvedValue(prompts)

      const affectedPromptIds = await deleteVariablePreset("preset-2")

      expect(affectedPromptIds).toEqual(["prompt-1"])
      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith({})
    })

    it("should throw error when preset does not exist", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      await expect(deleteVariablePreset("non-existent")).rejects.toThrow(
        "Preset with id non-existent not found",
      )
    })
  })

  describe("duplicateVariablePreset", () => {
    it("should create a copy of preset with new ID", async () => {
      const presets = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const duplicated = await duplicateVariablePreset("preset-1")

      expect(duplicated.id).not.toBe("preset-1")
      expect(duplicated.name).toBe("Test Preset (Copy)")
      expect(duplicated.type).toBe(mockPreset.type)
      expect(duplicated.description).toBe(mockPreset.description)
      expect(duplicated.textContent).toBe(mockPreset.textContent)
    })

    it("should duplicate dictionary items with new IDs", async () => {
      const presets = {
        "preset-2": {
          ...mockDictionaryPreset,
          createdAt: mockDictionaryPreset.createdAt.toISOString(),
          updatedAt: mockDictionaryPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const duplicated = await duplicateVariablePreset("preset-2")

      expect(duplicated.dictionaryItems).toHaveLength(2)
      expect(duplicated.dictionaryItems![0].id).not.toBe("item-1")
      expect(duplicated.dictionaryItems![0].name).toBe("Customer")
      expect(duplicated.dictionaryItems![0].content).toBe(
        "You are a customer...",
      )
    })

    it("should throw error when preset does not exist", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      await expect(duplicateVariablePreset("non-existent")).rejects.toThrow(
        "Preset with id non-existent not found",
      )
    })
  })

  describe("findPromptsByPresetId", () => {
    it("should return empty array when no prompts use the preset", async () => {
      vi.mocked(promptsStorage.getValue).mockResolvedValue({})

      const result = await findPromptsByPresetId("preset-1")

      expect(result).toEqual([])
    })

    it("should return prompts that reference the preset", async () => {
      const prompts = {
        "prompt-1": {
          ...mockPrompt,
          createdAt: mockPrompt.createdAt.toISOString(),
          updatedAt: mockPrompt.updatedAt.toISOString(),
          lastExecutedAt: mockPrompt.lastExecutedAt.toISOString(),
        },
        "prompt-2": {
          ...mockPrompt,
          id: "prompt-2",
          variables: [],
          createdAt: mockPrompt.createdAt.toISOString(),
          updatedAt: mockPrompt.updatedAt.toISOString(),
          lastExecutedAt: mockPrompt.lastExecutedAt.toISOString(),
        },
      }
      vi.mocked(promptsStorage.getValue).mockResolvedValue(prompts)

      const result = await findPromptsByPresetId("preset-2")

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("prompt-1")
    })

    it("should return multiple prompts that reference the same preset", async () => {
      const prompts = {
        "prompt-1": {
          ...mockPrompt,
          createdAt: mockPrompt.createdAt.toISOString(),
          updatedAt: mockPrompt.updatedAt.toISOString(),
          lastExecutedAt: mockPrompt.lastExecutedAt.toISOString(),
        },
        "prompt-2": {
          ...mockPrompt,
          id: "prompt-2",
          createdAt: mockPrompt.createdAt.toISOString(),
          updatedAt: mockPrompt.updatedAt.toISOString(),
          lastExecutedAt: mockPrompt.lastExecutedAt.toISOString(),
        },
      }
      vi.mocked(promptsStorage.getValue).mockResolvedValue(prompts)

      const result = await findPromptsByPresetId("preset-2")

      expect(result).toHaveLength(2)
    })
  })

  describe("exportVariablePresets", () => {
    it("should export selected presets as JSON", async () => {
      const presets = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
        "preset-2": {
          ...mockDictionaryPreset,
          createdAt: mockDictionaryPreset.createdAt.toISOString(),
          updatedAt: mockDictionaryPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const result = await exportVariablePresets(["preset-1"])

      const exported = JSON.parse(result)
      expect(exported).toHaveLength(1)
      expect(exported[0].id).toBe("preset-1")
    })

    it("should export multiple presets", async () => {
      const presets = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
        "preset-2": {
          ...mockDictionaryPreset,
          createdAt: mockDictionaryPreset.createdAt.toISOString(),
          updatedAt: mockDictionaryPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const result = await exportVariablePresets(["preset-1", "preset-2"])

      const exported = JSON.parse(result)
      expect(exported).toHaveLength(2)
    })

    it("should throw error when preset not found", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      await expect(exportVariablePresets(["non-existent"])).rejects.toThrow()
    })
  })

  describe("importVariablePresets", () => {
    it("should import presets in merge mode", async () => {
      const existing = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(existing)

      const toImport = [mockDictionaryPreset]
      const jsonData = JSON.stringify(
        toImport.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      )

      const count = await importVariablePresets(jsonData, "merge")

      expect(count).toBe(1)
      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith(
        expect.objectContaining({
          "preset-1": existing["preset-1"],
          "preset-2": expect.any(Object),
        }),
      )
    })

    it("should import presets in replace mode", async () => {
      const existing = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(existing)

      const toImport = [mockDictionaryPreset]
      const jsonData = JSON.stringify(
        toImport.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      )

      const count = await importVariablePresets(jsonData, "replace")

      expect(count).toBe(1)
      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith(
        expect.not.objectContaining({
          "preset-1": expect.any(Object),
        }),
      )
    })

    it("should throw error for invalid JSON", async () => {
      await expect(
        importVariablePresets("invalid json", "merge"),
      ).rejects.toThrow()
    })
  })
})
