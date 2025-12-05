/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { Prompt } from "@/types/prompt"
import type { ExportOptions } from "../types"

// Mock PromptServiceFacade
vi.mock("@/services/promptServiceFacade", () => ({
  PromptServiceFacade: {
    getInstance: vi.fn(() => ({
      getPrompts: vi.fn(),
    })),
  },
}))

import { PromptExportService } from "../promptExportService"
import { PromptServiceFacade } from "@/services/promptServiceFacade"
import Papa from "papaparse"

// Mock DOM APIs
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockBlob = vi.fn()

// Mock global Blob
vi.stubGlobal("Blob", mockBlob)
vi.stubGlobal("URL", {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
})

Object.defineProperty(document, "createElement", {
  value: vi.fn(() => ({
    setAttribute: vi.fn(),
    click: mockClick,
    style: {},
    download: undefined,
  })),
  writable: true,
})

Object.defineProperty(document.body, "appendChild", {
  value: mockAppendChild,
  writable: true,
})

Object.defineProperty(document.body, "removeChild", {
  value: mockRemoveChild,
  writable: true,
})

describe("PromptExportService", () => {
  let service: PromptExportService
  let mockDate: Date

  beforeEach(() => {
    // Reset all mocks first
    vi.clearAllMocks()

    service = new PromptExportService()
    mockDate = new Date("2024-01-15T10:30:45.123Z")
    vi.setSystemTime(mockDate)

    // Get the mocked getPrompts function after clearing mocks
    vi.mocked(PromptServiceFacade.getInstance().getPrompts)

    // Setup default mock values
    mockCreateObjectURL.mockReturnValue("blob:mock-url")
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockPrompt = (overrides: Partial<Prompt> = {}): Prompt => ({
    id: "test-id",
    name: "Test Prompt",
    content: "Test content",
    executionCount: 1,
    lastExecutedAt: new Date("2024-01-10T10:00:00.000Z"),
    isPinned: false,
    lastExecutionUrl: "https://example.com",
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    variables: undefined,
    isAIGenerated: undefined,
    aiMetadata: undefined,
    categoryId: undefined,
    useCase: undefined,
    ...overrides,
  })

  describe("convertToCSV", () => {
    it("should convert empty array to CSV with headers only", () => {
      const result = (service as any).convertToCSV([])

      expect(result).toContain(
        `"name","content","executionCount","lastExecutedAt","isPinned","lastExecutionUrl","createdAt","updatedAt","variables","isAIGenerated","aiMetadata","categoryId","useCase"`,
      )
      expect(result.split("\n")).toHaveLength(2) // Header + empty line
    })

    it("should convert single prompt to CSV", () => {
      const prompt = createMockPrompt()
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")
      expect(result).toContain("Test content")
      expect(result).toContain("1")
      expect(result).toContain("2024-01-10T10:00:00.000Z")
      expect(result).toContain("false")
      expect(result).toContain("https://example.com")
    })

    it("should convert multiple prompts to CSV", () => {
      const prompts = [
        createMockPrompt({ name: "Prompt 1", content: "Content 1" }),
        createMockPrompt({
          name: "Prompt 2",
          content: "Content 2",
          isPinned: true,
        }),
      ]
      const result = (service as any).convertToCSV(prompts)

      expect(result).toContain("Prompt 1")
      expect(result).toContain("Prompt 2")
      expect(result).toContain("Content 1")
      expect(result).toContain("Content 2")
      expect(result).toContain("true")
      expect(result).toContain("false")
    })

    it("should handle special characters in CSV", () => {
      const prompt = createMockPrompt({
        name: 'Prompt with "quotes"',
        content: "Content with\nnewline and, comma",
      })
      const result = (service as any).convertToCSV([prompt])

      // Should contain escaped quotes and properly formatted content
      expect(result).toContain('"Prompt with ""quotes"""')
      expect(result).toContain('"Content with\nnewline and, comma"')
    })
  })

  describe("generateFileName", () => {
    it("should generate filename with correct format", () => {
      const filename = (service as any).generateFileName()

      expect(filename).toBe("prompts-export-2024-01-15T10-30-45.csv")
    })

    it("should generate unique filenames for different times", () => {
      const filename1 = (service as any).generateFileName()

      vi.setSystemTime(new Date("2024-01-15T10:30:46.123Z"))
      const filename2 = (service as any).generateFileName()

      expect(filename1).not.toBe(filename2)
      expect(filename2).toBe("prompts-export-2024-01-15T10-30-46.csv")
    })
  })

  describe("downloadCSV", () => {
    it("should create blob and trigger download", () => {
      const csvData = "test,csv,data"
      const filename = "test.csv"

      ;(service as any).downloadCSV(csvData, filename)

      // Check Blob creation
      expect(mockBlob).toHaveBeenCalledWith([csvData], {
        type: "text/csv;charset=utf-8;",
      })

      // Check URL creation
      expect(mockCreateObjectURL).toHaveBeenCalled()

      // Check element creation and setup
      expect(document.createElement).toHaveBeenCalledWith("a")

      // Check click and cleanup
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
    })
  })

  describe("exportToCSV", () => {
    const mockPrompts = [
      createMockPrompt({
        name: "Prompt 1",
        isPinned: true,
        createdAt: new Date("2024-01-05T10:00:00.000Z"),
      }),
      createMockPrompt({
        name: "Prompt 2",
        isPinned: false,
        createdAt: new Date("2024-01-10T10:00:00.000Z"),
      }),
      createMockPrompt({
        name: "Prompt 3",
        isPinned: true,
        createdAt: new Date("2024-01-20T10:00:00.000Z"),
      }),
    ]

    it("should export all prompts when no options provided", async () => {
      // Mock the serviceFacade directly on the service instance
      ;(service as any).serviceFacade = {
        getPrompts: vi.fn().mockResolvedValue(mockPrompts),
      }

      await service.exportToCSV()

      expect((service as any).serviceFacade.getPrompts).toHaveBeenCalled()
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
    })

    it("should filter pinned prompts only", async () => {
      ;(service as any).serviceFacade = {
        getPrompts: vi.fn().mockResolvedValue(mockPrompts),
      }
      const spy = vi.spyOn(service as any, "convertToCSV")

      await service.exportToCSV({ pinnedOnly: true })

      expect(spy).toHaveBeenCalledWith([
        expect.objectContaining({ name: "Prompt 1" }),
        expect.objectContaining({ name: "Prompt 3" }),
      ])
    })

    it("should filter by date range", async () => {
      ;(service as any).serviceFacade = {
        getPrompts: vi.fn().mockResolvedValue(mockPrompts),
      }
      const spy = vi.spyOn(service as any, "convertToCSV")
      const options: ExportOptions = {
        dateRange: {
          from: new Date("2024-01-08T00:00:00.000Z"),
          to: new Date("2024-01-15T23:59:59.999Z"),
        },
      }

      await service.exportToCSV(options)

      expect(spy).toHaveBeenCalledWith([
        expect.objectContaining({ name: "Prompt 2" }),
      ])
    })

    it("should apply both pinned and date range filters", async () => {
      ;(service as any).serviceFacade = {
        getPrompts: vi.fn().mockResolvedValue(mockPrompts),
      }
      const spy = vi.spyOn(service as any, "convertToCSV")
      const options: ExportOptions = {
        pinnedOnly: true,
        dateRange: {
          from: new Date("2024-01-15T00:00:00.000Z"),
          to: new Date("2024-01-25T23:59:59.999Z"),
        },
      }

      await service.exportToCSV(options)

      expect(spy).toHaveBeenCalledWith([
        expect.objectContaining({ name: "Prompt 3" }),
      ])
    })

    it("should throw error when getPrompts fails", async () => {
      ;(service as any).serviceFacade = {
        getPrompts: vi.fn().mockRejectedValue(new Error("Database error")),
      }

      await expect(service.exportToCSV()).rejects.toThrow(
        "Export failed: Error: Database error",
      )
    })

    it("should handle empty prompts array", async () => {
      ;(service as any).serviceFacade = {
        getPrompts: vi.fn().mockResolvedValue([]),
      }

      await expect(service.exportToCSV()).resolves.not.toThrow()
      expect((service as any).serviceFacade.getPrompts).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe("convertToCSV with variables", () => {
    it("should export prompt with variables as JSON string", () => {
      const prompt = createMockPrompt({
        variables: [
          {
            name: "name",
            type: "text",
            defaultValue: "John",
          },
          {
            name: "age",
            type: "select",
            defaultValue: "30",
            selectOptions: {
              options: ["20", "30", "40"],
            },
          },
        ],
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")
      // Variables should be exported as JSON string
      // Use Papa Parse to parse the CSV back and verify variables
      const parsed = Papa.parse<{ variables: string }>(result, { header: true })
      const row = parsed.data[0]
      expect(row.variables).toBeDefined()
      const variables = JSON.parse(row.variables)
      expect(variables).toHaveLength(2)
      expect(variables[0].name).toBe("name")
      expect(variables[0].type).toBe("text")
      expect(variables[0].defaultValue).toBe("John")
    })

    it("should export prompt without variables as empty string", () => {
      const prompt = createMockPrompt({
        variables: undefined,
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")
      // Variables column should be empty
      const lines = result.split("\n")
      expect(lines[1]).toContain('""') // Empty string for variables column
    })

    it("should export prompt with empty variables array", () => {
      const prompt = createMockPrompt({
        variables: [],
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")
      // Empty array should be serialized as "[]"
      expect(result).toContain("[]")
    })
  })

  describe("convertToCSV with AI metadata and organization fields", () => {
    it("should export prompt with all AI metadata fields", () => {
      const prompt = createMockPrompt({
        isAIGenerated: true,
        aiMetadata: {
          sourcePromptIds: ["id1", "id2", "id3"],
          sourceCount: 3,
          confirmed: true,
          showInPinned: true,
        },
        categoryId: "cat-123",
        useCase: "Code review automation",
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")

      // Parse CSV to verify fields
      const parsed = Papa.parse<{
        isAIGenerated: string
        aiMetadata: string
        categoryId: string
        useCase: string
      }>(result, { header: true })
      const row = parsed.data[0]

      expect(row.isAIGenerated).toBe("true")
      expect(row.categoryId).toBe("cat-123")
      expect(row.useCase).toBe("Code review automation")

      const aiMetadata = JSON.parse(row.aiMetadata)
      expect(aiMetadata.sourcePromptIds).toEqual(["id1", "id2", "id3"])
      expect(aiMetadata.sourceCount).toBe(3)
      expect(aiMetadata.confirmed).toBe(true)
      expect(aiMetadata.showInPinned).toBe(true)
    })

    it("should export prompt with AI metadata undefined", () => {
      const prompt = createMockPrompt({
        isAIGenerated: undefined,
        aiMetadata: undefined,
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")

      // Parse CSV to verify fields
      const parsed = Papa.parse<{
        isAIGenerated: string
        aiMetadata: string
      }>(result, { header: true })
      const row = parsed.data[0]

      expect(row.isAIGenerated).toBe("false")
      expect(row.aiMetadata).toBe("")
    })

    it("should export prompt with null categoryId", () => {
      const prompt = createMockPrompt({
        categoryId: null,
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")

      // Parse CSV to verify fields
      const parsed = Papa.parse<{
        categoryId: string
      }>(result, { header: true })
      const row = parsed.data[0]

      expect(row.categoryId).toBe("")
    })

    it("should export prompt with empty sourcePromptIds array", () => {
      const prompt = createMockPrompt({
        isAIGenerated: true,
        aiMetadata: {
          sourcePromptIds: [],
          sourceCount: 0,
          confirmed: true,
          showInPinned: false,
        },
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")

      // Parse CSV to verify fields
      const parsed = Papa.parse<{
        aiMetadata: string
      }>(result, { header: true })
      const row = parsed.data[0]

      const aiMetadata = JSON.parse(row.aiMetadata)
      expect(aiMetadata.sourcePromptIds).toEqual([])
      expect(aiMetadata.sourceCount).toBe(0)
    })

    it("should handle special characters in useCase", () => {
      const prompt = createMockPrompt({
        useCase: 'Testing with "quotes", newlines\nand, commas',
      })
      const result = (service as any).convertToCSV([prompt])

      // Parse CSV to verify proper escaping
      const parsed = Papa.parse<{
        useCase: string
      }>(result, { header: true })
      const row = parsed.data[0]

      expect(row.useCase).toBe('Testing with "quotes", newlines\nand, commas')
    })

    it("should export prompt with only categoryId set", () => {
      const prompt = createMockPrompt({
        categoryId: "tech-category",
        isAIGenerated: false,
        aiMetadata: undefined,
        useCase: undefined,
      })
      const result = (service as any).convertToCSV([prompt])

      expect(result).toContain("Test Prompt")

      // Parse CSV to verify fields
      const parsed = Papa.parse<{
        categoryId: string
        isAIGenerated: string
        aiMetadata: string
        useCase: string
      }>(result, { header: true })
      const row = parsed.data[0]

      expect(row.categoryId).toBe("tech-category")
      expect(row.isAIGenerated).toBe("false")
      expect(row.aiMetadata).toBe("")
      expect(row.useCase).toBe("")
    })
  })
})
