import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  getVariablePresets,
  saveVariablePreset,
  deleteVariablePreset,
  duplicateVariablePreset,
  findPromptsByPresetId,
  exportVariablePresets,
  importVariablePresets,
  watchVariablePresets,
  watchVariablePreset,
} from "../variablePresetStorage"
import type { VariablePreset, Prompt } from "../../../types/prompt"
import {
  variablePresetsStorage,
  variablePresetsOrderStorage,
  promptsStorage,
} from "../definitions"

// Mock storage definitions
vi.mock("../definitions", () => ({
  variablePresetsStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
    watch: vi.fn(),
  },
  variablePresetsOrderStorage: {
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
        presetOptions: {
          presetId: "preset-2",
        },
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getVariablePresets", () => {
    it("should return empty array when no presets exist", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([
        "preset-1",
      ])

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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([
        "preset-1",
      ])

      const result = await getVariablePresets()

      expect(result[0].createdAt).toBeInstanceOf(Date)
      expect(result[0].updatedAt).toBeInstanceOf(Date)
    })
  })

  describe("saveVariablePreset", () => {
    it("should create new preset when preset does not exist", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])
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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([
        "preset-1",
      ])
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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([
        "preset-2",
      ])
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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

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
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

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
    it("should export selected presets as CSV", async () => {
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

      const lines = result.split("\n")
      expect(lines).toHaveLength(2) // Header + 1 data row
      // papaparse outputs quoted headers
      expect(lines[0]).toContain("id")
      expect(lines[0]).toContain("name")
      expect(lines[0]).toContain("type")
      expect(lines[1]).toContain("preset-1")
      expect(lines[1]).toContain("Test Preset")
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

      const lines = result.split("\n")
      expect(lines).toHaveLength(3) // Header + 2 data rows
    })

    it("should export selectOptions as comma-separated string", async () => {
      const selectPreset = {
        ...mockPreset,
        id: "preset-select",
        type: "select" as const,
        selectOptions: ["Option 1", "Option 2", "Option 3"],
      }
      const presets = {
        "preset-select": {
          ...selectPreset,
          createdAt: selectPreset.createdAt.toISOString(),
          updatedAt: selectPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const result = await exportVariablePresets(["preset-select"])

      const lines = result.split("\n")
      expect(lines[1]).toContain("Option 1,Option 2,Option 3")
    })

    it("should export dictionaryItems as JSON", async () => {
      const presets = {
        "preset-2": {
          ...mockDictionaryPreset,
          createdAt: mockDictionaryPreset.createdAt.toISOString(),
          updatedAt: mockDictionaryPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const result = await exportVariablePresets(["preset-2"])

      const lines = result.split("\n")
      // dictionaryItems should be in JSON format and properly escaped in CSV
      expect(lines[1]).toContain('"[{')
      expect(lines[1]).toContain("Customer")
      expect(lines[1]).toContain("Manager")
    })

    it("should handle special characters in CSV", async () => {
      const specialPreset = {
        ...mockPreset,
        id: "preset-special",
        name: 'Preset with "quotes" and, commas',
        description: "Line 1\nLine 2",
      }
      const presets = {
        "preset-special": {
          ...specialPreset,
          createdAt: specialPreset.createdAt.toISOString(),
          updatedAt: specialPreset.updatedAt.toISOString(),
        },
      }
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue(presets)

      const result = await exportVariablePresets(["preset-special"])

      const lines = result.split("\n")
      // Fields with special characters should be quoted
      expect(lines[1]).toContain('""quotes""') // Escaped quotes
      expect(lines[1]).toContain('"Preset with ""quotes"" and, commas"')
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

      const csvData = [
        "id,name,type,description,textContent,selectOptions,dictionaryItems,createdAt,updatedAt",
        'preset-2,Role,dictionary,User roles,,,\"[{\"\"id\"\":\"\"item-1\"\",\"\"name\"\":\"\"Customer\"\",\"\"content\"\":\"\"You are a customer...\"\"},{\"\"id\"\":\"\"item-2\"\",\"\"name\"\":\"\"Manager\"\",\"\"content\"\":\"\"You are a manager...\"\"}]\",2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
      ].join("\n")

      const count = await importVariablePresets(csvData, "merge")

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

      const csvData = [
        "id,name,type,description,textContent,selectOptions,dictionaryItems,createdAt,updatedAt",
        'preset-2,Role,dictionary,User roles,,,\"[{\"\"id\"\":\"\"item-1\"\",\"\"name\"\":\"\"Customer\"\",\"\"content\"\":\"\"You are a customer...\"\"},{\"\"id\"\":\"\"item-2\"\",\"\"name\"\":\"\"Manager\"\",\"\"content\"\":\"\"You are a manager...\"\"}]\",2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
      ].join("\n")

      const count = await importVariablePresets(csvData, "replace")

      expect(count).toBe(1)
      expect(variablePresetsStorage.setValue).toHaveBeenCalledWith(
        expect.not.objectContaining({
          "preset-1": expect.any(Object),
        }),
      )
    })

    it("should import selectOptions from comma-separated string", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      const csvData = [
        "id,name,type,description,textContent,selectOptions,dictionaryItems,createdAt,updatedAt",
        'preset-select,Select Preset,select,,,\"Option 1,Option 2,Option 3\",,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
      ].join("\n")

      const count = await importVariablePresets(csvData, "merge")

      expect(count).toBe(1)
      const savedData =
        vi.mocked(variablePresetsStorage.setValue).mock.calls[0][0]
      expect(savedData["preset-select"].selectOptions).toEqual([
        "Option 1",
        "Option 2",
        "Option 3",
      ])
    })

    it("should import dictionaryItems from JSON string", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      const csvData = [
        "id,name,type,description,textContent,selectOptions,dictionaryItems,createdAt,updatedAt",
        'preset-dict,Dict Preset,dictionary,,,,"[{""id"":""item-1"",""name"":""Test"",""content"":""Content""}]",2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z',
      ].join("\n")

      const count = await importVariablePresets(csvData, "merge")

      expect(count).toBe(1)
      const savedData =
        vi.mocked(variablePresetsStorage.setValue).mock.calls[0][0]
      expect(savedData["preset-dict"].dictionaryItems).toEqual([
        { id: "item-1", name: "Test", content: "Content" },
      ])
    })

    it("should handle quoted fields with special characters", async () => {
      vi.mocked(variablePresetsStorage.getValue).mockResolvedValue({})

      // Note: In CSV, newlines inside quoted fields are literal newlines
      const descriptionWithNewline = "Line 1\nLine 2"
      const csvData =
        "id,name,type,description,textContent,selectOptions,dictionaryItems,createdAt,updatedAt\n" +
        `preset-special,"Name with ""quotes"" and, comma",text,"${descriptionWithNewline}",Text content,,,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z`

      const count = await importVariablePresets(csvData, "merge")

      expect(count).toBe(1)
      const savedData =
        vi.mocked(variablePresetsStorage.setValue).mock.calls[0][0]
      expect(savedData["preset-special"].name).toBe(
        'Name with "quotes" and, comma',
      )
      expect(savedData["preset-special"].description).toBe("Line 1\nLine 2")
    })

    it("should throw error for invalid CSV format", async () => {
      await expect(
        importVariablePresets("invalid csv", "merge"),
      ).rejects.toThrow("Invalid CSV format")
    })

    it("should throw error for invalid dictionaryItems JSON", async () => {
      const csvData = [
        "id,name,type,description,textContent,selectOptions,dictionaryItems,createdAt,updatedAt",
        "preset-bad,Bad Preset,dictionary,,,,invalid json,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z",
      ].join("\n")

      await expect(importVariablePresets(csvData, "merge")).rejects.toThrow(
        "Invalid JSON format for dictionaryItems",
      )
    })
  })

  describe("watchVariablePresets", () => {
    it("should call callback when presets change", async () => {
      const callback = vi.fn()
      const unwatch = vi.fn()

      const stored = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }

      // Mock watch to immediately call callback with new value
      vi.mocked(variablePresetsStorage.watch).mockImplementation((cb) => {
        cb(stored, {})
        return unwatch
      })

      // Mock order storage
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([
        "preset-1",
      ])

      watchVariablePresets(callback)

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(callback).toHaveBeenCalledWith([mockPreset])
    })

    it("should return unsubscribe function", async () => {
      const callback = vi.fn()
      const unwatch = vi.fn()

      vi.mocked(variablePresetsStorage.watch).mockReturnValue(unwatch)
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

      const result = watchVariablePresets(callback)

      expect(result).toBe(unwatch)
    })

    it("should sort presets by order", async () => {
      const callback = vi.fn()
      const stored = {
        "preset-1": {
          ...mockPreset,
          id: "preset-1",
          name: "First",
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
        "preset-2": {
          ...mockPreset,
          id: "preset-2",
          name: "Second",
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }

      vi.mocked(variablePresetsStorage.watch).mockImplementation((cb) => {
        cb(stored, {})
        return vi.fn()
      })

      // Order: preset-2 first, then preset-1
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([
        "preset-2",
        "preset-1",
      ])

      watchVariablePresets(callback)

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({ id: "preset-2", name: "Second" }),
        expect.objectContaining({ id: "preset-1", name: "First" }),
      ])
    })
  })

  describe("watchVariablePreset", () => {
    it("should call callback with specific preset when it changes", async () => {
      const callback = vi.fn()
      const stored = {
        "preset-1": {
          ...mockPreset,
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }

      vi.mocked(variablePresetsStorage.watch).mockImplementation((cb) => {
        cb(stored, {})
        return vi.fn()
      })
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

      watchVariablePreset("preset-1", callback)

      expect(callback).toHaveBeenCalledWith(mockPreset)
    })

    it("should call callback with null when preset is deleted", async () => {
      const callback = vi.fn()
      const stored = {}

      vi.mocked(variablePresetsStorage.watch).mockImplementation((cb) => {
        cb(stored, {})
        return vi.fn()
      })
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

      watchVariablePreset("preset-1", callback)

      expect(callback).toHaveBeenCalledWith(null)
    })

    it("should return unsubscribe function", async () => {
      const callback = vi.fn()
      const unwatch = vi.fn()

      vi.mocked(variablePresetsStorage.watch).mockReturnValue(unwatch)
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

      const result = watchVariablePreset("preset-1", callback)

      expect(result).toBe(unwatch)
    })

    it("should only call callback for matching preset ID", async () => {
      const callback = vi.fn()
      const stored = {
        "preset-1": {
          ...mockPreset,
          id: "preset-1",
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
        "preset-2": {
          ...mockPreset,
          id: "preset-2",
          createdAt: mockPreset.createdAt.toISOString(),
          updatedAt: mockPreset.updatedAt.toISOString(),
        },
      }

      vi.mocked(variablePresetsStorage.watch).mockImplementation((cb) => {
        cb(stored, {})
        return vi.fn()
      })
      vi.mocked(variablePresetsOrderStorage.getValue).mockResolvedValue([])

      watchVariablePreset("preset-1", callback)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: "preset-1" }),
      )
      expect(callback).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: "preset-2" }),
      )
    })
  })
})
